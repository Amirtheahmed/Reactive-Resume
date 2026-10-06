import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { Template } from "@reactive-resume/schema/templates";
import type { HTMLElement } from "node-html-parser";
import { ORPCError } from "@orpc/client";
import { parse as parseHtml } from "node-html-parser";
import z from "zod";
import { parseResumeData, skillItemSchema } from "@reactive-resume/schema/resume/data";
import { generateId } from "@reactive-resume/utils/string";
import { resumeService } from "../resume/service";

/**
 * The resume carrying this tag is the user's master profile: everything they could put on a resume.
 * Tailored resumes, cover letters and autofill answers are all generated from it.
 */
// ponytail: a tag instead of an is_master column; add the column if users need exactly-one enforcement.
const MASTER_TAG = "master";

export async function getMasterResume(userId: string) {
	const [latest] = await resumeService.list({ userId, tags: [MASTER_TAG], sort: "lastUpdatedAt" });
	if (!latest) {
		throw new ORPCError("BAD_REQUEST", {
			message: `No master resume found. Add the tag "${MASTER_TAG}" to the resume that holds your full profile.`,
		});
	}
	return resumeService.getById({ id: latest.id, userId });
}

/** The master resume without presentation settings or hidden entries, as compact JSON for a prompt. */
export function profileForPrompt(data: ResumeData): string {
	// References are other people's contact details: never sent to a model or offered to a form.
	const { references: _references, ...ownSections } = data.sections;
	const sections = Object.fromEntries(
		Object.entries(ownSections).map(([key, section]) => [
			key,
			(section.items as Record<string, unknown>[])
				.filter((item) => !item.hidden)
				.map(({ hidden: _hidden, icon: _icon, iconColor: _iconColor, ...item }) => item),
		]),
	);
	// Custom sections hold what the standard ones cannot: an FAQ, preferences, extra projects. They are
	// background for the model, so they are sent whole, apart from anyone else's contact details.
	const background = data.customSections
		.filter((section) => !section.hidden && section.type !== "references")
		.map((section) => ({
			title: section.title,
			items: (section.items as Record<string, unknown>[])
				.filter((item) => !item.hidden)
				.map(({ id: _id, hidden: _hidden, icon: _icon, iconColor: _iconColor, ...item }) => item),
		}));
	const { name, headline, email, phone, location, website, customFields } = data.basics;
	return JSON.stringify({
		basics: {
			name,
			headline,
			email,
			phone,
			location,
			website: website.url,
			customFields: customFields.map(({ text, link }) => ({ text, link })),
		},
		summary: data.summary.content,
		sections,
		background,
	});
}

// Tolerant of LLM variance, like upstream's AI outputs: a malformed part costs that part, and lists are capped.
const rewrite = z.object({ id: z.string(), description: z.string().catch("") });

export const tailoringSchema = z.object({
	summary: z.string().catch(""),
	experience: z
		.array(rewrite.extend({ roles: z.array(rewrite).catch([]) }))
		.catch([])
		.transform((items) => items.slice(0, 4)),
	projects: z
		.array(rewrite)
		.catch([])
		.transform((items) => items.slice(0, 2)),
	skills: z
		.array(z.object({ name: z.string(), keywords: z.array(z.string()).catch([]) }))
		.catch([])
		.transform((items) => items.slice(0, 6)),
});

export type Tailoring = z.infer<typeof tailoringSchema>;

/**
 * Builds the tailored resume from the master: the model only chooses entries by id and rewrites their
 * descriptions, so employers, titles and dates always come from the master and the result stays schema-valid.
 */
export function applyTailoring(master: ResumeData, tailoring: Tailoring, template: Template): ResumeData {
	const data = structuredClone(master);

	const pick = <T extends { id: string; hidden: boolean; description: string }>(
		items: T[],
		rewrites: { id: string; description: string }[],
	) =>
		rewrites.flatMap(({ id, description }) => {
			const item = items.find((candidate) => candidate.id === id && !candidate.hidden);
			return item ? [{ ...item, description: description || item.description }] : [];
		});

	const experience = pick(data.sections.experience.items, tailoring.experience).map((item) => {
		const roles = tailoring.experience.find(({ id }) => id === item.id)?.roles ?? [];
		return {
			...item,
			roles: item.roles.map((role) => ({
				...role,
				description: roles.find(({ id }) => id === role.id)?.description || role.description,
			})),
		};
	});
	// A reply that references none of the master's entries is a failed generation, not an empty resume.
	if (experience.length === 0 && data.sections.experience.items.some((item) => !item.hidden)) {
		throw new ORPCError("BAD_GATEWAY", { message: "The AI response did not select any experience. Try again." });
	}
	data.sections.experience.items = experience;
	data.sections.projects.items = pick(data.sections.projects.items, tailoring.projects);

	if (tailoring.skills.length > 0) {
		data.sections.skills.items = tailoring.skills.map(({ name, keywords }) =>
			skillItemSchema.parse({ id: generateId(), hidden: false, icon: "", name, proficiency: "", level: 0, keywords }),
		);
	}

	// The master's custom sections are background (FAQ, preferences, notes), not resume content: a tailored
	// resume is built from the standard sections only.
	const background = new Set(data.customSections.map((section) => section.id));
	data.customSections = [];
	for (const page of data.metadata.layout.pages) {
		page.main = page.main.filter((id) => !background.has(id));
		page.sidebar = page.sidebar.filter((id) => !background.has(id));
	}

	data.summary.content = tailoring.summary;
	data.summary.hidden = tailoring.summary.trim() === "";
	data.metadata.template = template;
	// Goldstar is the plain LaTeX-style layout: no icons anywhere.
	if (template === "goldstar") Object.assign(data.metadata.page, { hideIcons: true, hideSectionIcons: true });

	return parseResumeData(data);
}

export type AutofillProfile = {
	basics: {
		fullName: string;
		headline: string;
		firstName: string;
		lastName: string;
		email: string;
		phone: string;
		location: { address: string };
		url: string;
		linkedIn?: string;
		github?: string;
		twitter?: string;
	};
};

/** Deterministic contact details for form filling. No AI involved. */
export function autofillProfile(data: ResumeData): AutofillProfile {
	const { name, headline, email, phone, location, website, customFields } = data.basics;
	const [firstName = "", ...rest] = name.trim().split(/\s+/);

	// Profile links live in the profiles section; older data keeps them as header custom fields.
	const links = [
		...data.sections.profiles.items.filter((item) => !item.hidden).map((item) => [item.network, item.website.url]),
		...customFields.map((field) => [`${field.text} ${field.link}`, field.link || field.text]),
	] as [string, string][];
	const link = (network: string) => links.find(([label, url]) => url && label.toLowerCase().includes(network))?.[1];

	const linkedIn = link("linkedin");
	const github = link("github");
	const twitter = link("twitter");

	return {
		basics: {
			fullName: name,
			headline,
			firstName,
			lastName: rest.join(" "),
			email,
			phone,
			location: { address: location },
			url: website.url,
			...(linkedIn ? { linkedIn } : {}),
			...(github ? { github } : {}),
			...(twitter ? { twitter } : {}),
		},
	};
}

const FILLABLE_TAGS = new Set(["input", "textarea", "select"]);
const UNFILLABLE_INPUT_TYPES = new Set(["hidden", "password", "submit", "button", "reset", "image"]);
/** Ids and names that can be written into a quoted attribute selector without any escaping. */
const PLAIN_ATTRIBUTE_VALUE = /^[\w\-:.[\]@/ ]+$/;

/**
 * Checks a model-supplied CSS selector against the form it claims to describe. The form is parsed and the
 * selector is run against it, so the check sees what a browser would select rather than guessing from the
 * selector's text. Anything short of exactly one visible input, textarea or select is refused.
 *
 * Returns a selector written here from that element's own id or name, never the model's text, or null.
 * What this cannot see: styles from a stylesheet, and any difference between this parser and a browser.
 * A client must still fill only elements that are visible on the real page.
 */
export function createFormResolver(formHtml: string): (selector: string) => string | null {
	const root = parseHtml(formHtml);
	const elements = root.querySelectorAll("*");
	const isUnique = (attribute: string, value: string) =>
		elements.filter((element) => element.getAttribute(attribute) === value).length === 1;

	const isHidden = (element: HTMLElement) =>
		element.hasAttribute("hidden") ||
		element.getAttribute("aria-hidden") === "true" ||
		/display\s*:\s*none|visibility\s*:\s*hidden/i.test(element.getAttribute("style") ?? "");

	return (selector) => {
		if (selector.length > 300) return null;

		let matches: HTMLElement[];
		try {
			matches = root.querySelectorAll(selector);
		} catch {
			return null;
		}
		const [element] = matches;
		if (!element || matches.length !== 1) return null;

		if (!FILLABLE_TAGS.has(element.rawTagName.toLowerCase())) return null;
		if (UNFILLABLE_INPUT_TYPES.has((element.getAttribute("type") ?? "text").trim().toLowerCase())) return null;
		for (let node: HTMLElement | null = element; node; node = node.parentNode) {
			// The root is a document node without attributes.
			if (node.rawTagName && isHidden(node)) return null;
		}

		for (const attribute of ["id", "name"]) {
			const value = element.getAttribute(attribute);
			if (value && PLAIN_ATTRIBUTE_VALUE.test(value) && isUnique(attribute, value)) return `[${attribute}="${value}"]`;
		}
		return null;
	};
}
