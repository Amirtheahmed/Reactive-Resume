import z from "zod";
import { letterDraftSystemPrompt } from "@reactive-resume/ai/prompts";
import { coverLetterTextToHtml } from "@reactive-resume/resume/cover-letter";
import { buildMarkdown } from "@reactive-resume/resume/markdown";
import { templateSchema } from "@reactive-resume/schema/templates";
import { protectedProcedure } from "../../context";
import { aiRequestRateLimit } from "../../middleware/rate-limit";
import { generateJson, generatePlainText, resolveModel } from "../applications/ai";
import { coverLetterService } from "../cover-letters/service";
import { resumeService } from "../resume/service";
import { formAutofillSystemPrompt, questionAutofillSystemPrompt, resumeSystemPrompt } from "./prompts";
import {
	applyTailoring,
	autofillProfile,
	createFormResolver,
	getMasterResume,
	profileForPrompt,
	tailoringSchema,
} from "./service";

// Generation and form-filling from the user's master resume (the one tagged "master"). Fork-only feature:
// external clients (ITJobsMeter, the browser extension) drive these over /api/openapi.

const reserved = { tags: ["Copilot"] } as const;
const MAX_JOB_DESCRIPTION_CHARS = 20_000;
const MAX_FORM_HTML_CHARS = 200_000;

const aiErrors = {
	BAD_GATEWAY: { message: "The AI provider returned an error or is unreachable.", status: 502 },
	BAD_REQUEST: { message: "No master resume or no AI provider is set up.", status: 400 },
};

const jobInput = z.object({
	jobTitle: z.string().trim().min(1).max(200),
	companyName: z.string().trim().max(200).optional(),
	jobDescription: z.string().trim().min(1).max(MAX_JOB_DESCRIPTION_CHARS),
});

const jobContext = z.object({
	title: z.string().optional(),
	company: z.string().optional(),
	description: z.string().max(MAX_JOB_DESCRIPTION_CHARS).optional(),
	industry: z.string().optional(),
});

const documentName = (input: z.infer<typeof jobInput>) =>
	(input.companyName ? `${input.jobTitle} @ ${input.companyName}` : input.jobTitle).slice(0, 60);

const jobBlock = (job: z.infer<typeof jobContext> | undefined) =>
	job ? `<job>\n${JSON.stringify(job)}\n</job>\n\n` : "";

const confidence = z.coerce
	.number()
	.catch(0)
	.transform((n) => Math.max(0, Math.min(1, n)));

// The form HTML comes from an arbitrary web page, so the model's reply is treated as hostile: a page can
// try to talk the model into dumping the profile into a field. What is filled is decided here, against
// the submitted HTML and fixed limits, never by what the model says about a field.
const MAX_FILL_VALUE_CHARS = 2_000;
const MAX_FORM_FIELDS = 200;
const MAX_ANSWER_CHARS = 10_000;

/** Text the client only displays: clipped, and never a reason to reject the whole reply. */
const display = (max: number) =>
	z
		.string()
		.catch("")
		.transform((value) => value.slice(0, max));
const optionalDisplay = (max: number) =>
	z
		.string()
		.optional()
		.catch(undefined)
		.transform((value) => value?.slice(0, max));
const warnings = z
	.array(display(300))
	.catch([])
	.transform((items) => items.slice(0, 20));
const suggestions = z
	.array(display(300))
	.optional()
	.catch(undefined)
	.transform((items) => items?.slice(0, 10));

const formFieldOutput = z.object({
	selector: z.string(),
	type: display(40),
	action: z.enum(["fill", "select", "check", "upload"]).catch("fill"),
	value: z.string().nullable().catch(null),
	file_type: z.enum(["resume", "cover_letter", "portfolio"]).optional().catch(undefined),
	confidence,
	strategy: z.enum(["DETERMINISTIC", "AI_MAPPED", "AI_GENERATED", "SMART_DEFAULT"]).catch("AI_MAPPED"),
	reasoning: optionalDisplay(500),
});

const formReviewOutput = z.object({
	selector: display(300),
	type: display(40),
	label: display(300),
	reason: display(500),
	confidence,
	suggestions,
});

const formAutofillOutput = z.object({
	fields: z.array(formFieldOutput).catch([]),
	needs_review: z
		.array(formReviewOutput)
		.catch([])
		.transform((items) => items.slice(0, MAX_FORM_FIELDS)),
	warnings,
});

const questionInput = z.object({
	id: z.string().min(1).max(200),
	question: z.string().min(1).max(2_000),
	type: z
		.enum(["text", "textarea", "select", "multiselect", "date", "number", "boolean", "email", "phone", "url"])
		.default("text"),
	options: z.array(z.string().max(300)).max(200).optional(),
	context: z.string().max(2_000).optional(),
	required: z.boolean().default(false),
	maxLength: z.number().positive().optional(),
});

const answerOutput = z.object({
	question_id: z.string(),
	// An over-long or over-wide answer becomes null: the question is left for the user.
	value: z
		.union([z.string().max(MAX_ANSWER_CHARS), z.array(z.string().max(300)).max(200), z.number(), z.boolean(), z.null()])
		.catch(null),
	confidence,
	strategy: z.enum(["DETERMINISTIC", "AI_MAPPED", "AI_GENERATED", "SMART_DEFAULT"]).catch("AI_MAPPED"),
	reasoning: optionalDisplay(500),
	source_field: optionalDisplay(100),
});

const questionReviewOutput = z.object({
	question_id: z.string(),
	question: display(2_000),
	reason: display(500),
	confidence,
	suggestions,
	category: optionalDisplay(100),
});

const autofillProfileOutput = z.object({
	basics: z.object({
		fullName: z.string(),
		headline: z.string(),
		firstName: z.string(),
		lastName: z.string(),
		email: z.string(),
		phone: z.string(),
		location: z.object({ address: z.string() }),
		url: z.string(),
		linkedIn: z.string().optional(),
		github: z.string().optional(),
		twitter: z.string().optional(),
	}),
});

const questionAutofillOutput = z.object({
	answers: z.array(answerOutput).catch([]),
	needs_review: z.array(questionReviewOutput).catch([]),
	warnings,
});

const formAutofillResult = formAutofillOutput.extend({
	metadata: z.object({
		fields_extracted: z.number(),
		fields_filled: z.number(),
		fields_skipped: z.number(),
		processing_time_ms: z.number(),
	}),
});

const questionAutofillResult = questionAutofillOutput.extend({
	metadata: z.object({
		questions_received: z.number(),
		questions_answered: z.number(),
		questions_needs_review: z.number(),
		processing_time_ms: z.number(),
	}),
});

export const copilotRouter = {
	// Create a job-tailored resume from the master resume.
	generateResume: protectedProcedure
		.route({
			method: "POST",
			path: "/resumes/generations",
			operationId: "generateTailoredResume",
			summary: "Generate a tailored resume",
			description:
				'Creates a new resume for one job from the master resume (the resume tagged "master"). The AI selects the most relevant experience, projects and skills and rewrites their descriptions; employers, titles and dates are copied from the master. Download it with GET /resumes/{id}/pdf. Requires a configured AI provider.',
			...reserved,
		})
		.input(jobInput.extend({ template: templateSchema.default("goldstar") }))
		.use(aiRequestRateLimit)
		.output(z.object({ id: z.string(), name: z.string() }))
		.errors(aiErrors)
		.handler(async ({ context, input }) => {
			const [model, master] = await Promise.all([resolveModel(context.user.id), getMasterResume(context.user.id)]);

			const tailoring = await generateJson(
				model,
				{
					system: resumeSystemPrompt,
					prompt: `<profile>\n${profileForPrompt(master.data)}\n</profile>\n\n<job>\n${input.jobTitle}${input.companyName ? ` at ${input.companyName}` : ""}\n\n${input.jobDescription}\n</job>`,
				},
				tailoringSchema,
			);

			const name = documentName(input);
			const id = await resumeService.create({
				userId: context.user.id,
				name,
				tags: ["tailored"],
				data: applyTailoring(master.data, tailoring, input.template),
				locale: context.locale,
			});

			return { id, name };
		}),

	// Create a cover letter for a job from the master resume (or a given resume).
	generateCoverLetter: protectedProcedure
		.route({
			method: "POST",
			path: "/cover-letters/generations",
			operationId: "generateCoverLetter",
			summary: "Generate a cover letter",
			description:
				"Creates a saved cover letter for one job, written from the given resume or, when none is given, the master resume. Download it with GET /cover-letters/{id}/exports/pdf. Requires a configured AI provider.",
			...reserved,
		})
		.input(jobInput.extend({ resumeId: z.string().optional() }))
		.use(aiRequestRateLimit)
		.output(z.object({ id: z.string(), name: z.string() }))
		.errors(aiErrors)
		.handler(async ({ context, input }) => {
			const userId = context.user.id;
			const [model, resume] = await Promise.all([
				resolveModel(userId),
				input.resumeId ? resumeService.getById({ id: input.resumeId, userId }) : getMasterResume(userId),
			]);

			// Same prompt shape as the in-app letter draft (features/cover-letters/draft.ts), which only streams.
			const text = await generatePlainText(
				model,
				`${letterDraftSystemPrompt}\n\nWrite the body of the letter.\n\n## The job\n\n${input.jobTitle}${input.companyName ? ` at ${input.companyName}` : ""}\n\n## The posting\n\n<<<POSTING_START>>>\n${input.jobDescription}\n<<<POSTING_END>>>\n\n## The resume\n\n<<<RESUME_START>>>\n${buildMarkdown(resume.data)}\n<<<RESUME_END>>>`,
			);

			const name = documentName(input);
			const letter = await coverLetterService.create({
				userId,
				name,
				content: coverLetterTextToHtml(text),
				resumeId: resume.id,
				...(input.companyName ? { recipientCompany: input.companyName } : {}),
			});

			return { id: letter.id, name };
		}),

	// Contact details from the master resume, for deterministic form filling.
	autofillProfile: protectedProcedure
		.route({
			method: "GET",
			path: "/autofill/profile",
			operationId: "getAutofillProfile",
			summary: "Get autofill profile",
			description:
				"Returns the name, contact details and profile links from the master resume in a flat shape suited to filling application forms. No AI is involved.",
			...reserved,
		})
		.input(z.object({}).optional())
		.output(autofillProfileOutput)
		.handler(async ({ context }) => autofillProfile((await getMasterResume(context.user.id)).data)),

	// Fill instructions for every field of an application form's HTML.
	autofillForm: protectedProcedure
		.route({
			method: "POST",
			path: "/autofill/form",
			operationId: "autofillForm",
			summary: "Autofill an application form",
			description:
				"Analyses the HTML of a job application form and returns a fill instruction (selector, action, value, confidence) for each field, answered from the master resume. Low-confidence and sensitive fields are returned under needs_review instead. Requires a configured AI provider.",
			...reserved,
		})
		.input(
			z.object({
				form_html: z.string().min(1).max(MAX_FORM_HTML_CHARS),
				form_text: z.string().max(MAX_FORM_HTML_CHARS).optional(),
				page_url: z.string().optional(),
				job_context: jobContext.optional(),
			}),
		)
		.use(aiRequestRateLimit)
		.output(formAutofillResult)
		.errors(aiErrors)
		.handler(async ({ context, input }) => {
			const started = Date.now();
			const [model, master] = await Promise.all([resolveModel(context.user.id), getMasterResume(context.user.id)]);

			const result = await generateJson(
				model,
				{
					system: formAutofillSystemPrompt,
					prompt: `<profile>\n${profileForPrompt(master.data)}\n</profile>\n\n${jobBlock(input.job_context)}<form url="${input.page_url ?? ""}">\n${input.form_html}\n</form>${input.form_text ? `\n\n<form_text>\n${input.form_text}\n</form_text>` : ""}`,
				},
				formAutofillOutput,
			);

			// Enforced here rather than trusted: only confident, bounded values, and only into a control that the
			// selector really names in the submitted HTML. The model's own "type" is not evidence of anything, and
			// its selector text is replaced by one written from the matched element.
			const resolve = createFormResolver(input.form_html);
			const confident = result.fields.filter((field) => field.confidence >= 0.6);
			const fields = confident
				.flatMap((field) => {
					const selector = resolve(field.selector);
					return selector && (field.value?.length ?? 0) <= MAX_FILL_VALUE_CHARS ? [{ ...field, selector }] : [];
				})
				.slice(0, MAX_FORM_FIELDS);
			const rejected = confident.length - fields.length;

			return {
				fields,
				needs_review: result.needs_review,
				warnings: rejected
					? [...result.warnings, `${rejected} field(s) skipped: not a visible form control, or the value was too long.`]
					: result.warnings,
				metadata: {
					fields_extracted: result.fields.length + result.needs_review.length,
					fields_filled: fields.length,
					fields_skipped: result.fields.length - fields.length + result.needs_review.length,
					processing_time_ms: Date.now() - started,
				},
			};
		}),

	// Answers to a list of application questions.
	autofillQuestions: protectedProcedure
		.route({
			method: "POST",
			path: "/autofill/questions",
			operationId: "autofillQuestions",
			summary: "Answer application questions",
			description:
				"Answers up to 50 application form questions from the master resume, tailored to the job when a job context is given. Questions the profile cannot answer confidently are returned under needs_review instead. Requires a configured AI provider.",
			...reserved,
		})
		.input(
			z.object({
				questions: z.array(questionInput).min(1).max(50),
				job_context: jobContext.optional(),
				page_url: z.string().optional(),
				instructions: z.string().max(500).optional(),
			}),
		)
		.use(aiRequestRateLimit)
		.output(questionAutofillResult)
		.errors(aiErrors)
		.handler(async ({ context, input }) => {
			const started = Date.now();
			const [model, master] = await Promise.all([resolveModel(context.user.id), getMasterResume(context.user.id)]);

			const result = await generateJson(
				model,
				{
					system: questionAutofillSystemPrompt,
					prompt: `<profile>\n${profileForPrompt(master.data)}\n</profile>\n\n${jobBlock(input.job_context)}<questions>\n${JSON.stringify(input.questions)}\n</questions>${input.instructions ? `\n\nThe candidate's own instructions: ${input.instructions}` : ""}`,
				},
				questionAutofillOutput,
			);

			// One answer per question that was actually asked, whatever the model returns.
			const asked = new Set(input.questions.map((question) => question.id));
			const once = <T extends { question_id: string }>(items: T[]) => {
				const seen = new Set<string>();
				return items.filter(
					({ question_id }) => asked.has(question_id) && !seen.has(question_id) && seen.add(question_id),
				);
			};
			const answers = once(result.answers.filter((answer) => answer.confidence >= 0.6));
			return {
				answers,
				needs_review: once(result.needs_review),
				warnings: result.warnings,
				metadata: {
					questions_received: input.questions.length,
					questions_answered: answers.length,
					questions_needs_review: result.needs_review.length,
					processing_time_ms: Date.now() - started,
				},
			};
		}),
};
