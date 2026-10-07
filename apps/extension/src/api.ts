// Calls to the Reactive Resume instance, authenticated with the user's API key. The side panel is an
// extension page with host permission for that origin, so these requests are not subject to CORS.

const APP_URL = (import.meta.env.VITE_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const appUrl = (path: string) => `${APP_URL}${path}`;

export class ApiError extends Error {
	constructor(
		message: string,
		readonly status: number,
	) {
		super(message);
	}
}

export type Profile = {
	basics: {
		fullName: string;
		headline: string;
		email: string;
		phone: string;
		location: { address: string };
		url: string;
		linkedIn?: string;
		github?: string;
		twitter?: string;
	};
};

export type DocumentType = "resume" | "cover-letter";
export type GeneratedDocument = { id: string; name: string; type: DocumentType };

export type Job = { title: string; company: string; description: string; url: string };

export type Question = {
	id: string;
	question: string;
	type: "text" | "textarea" | "select" | "date" | "number" | "email" | "phone" | "url";
	options?: string[];
};

export type Answer = {
	question_id: string;
	value: string | string[] | number | boolean | null;
	strategy: string;
};

async function request(path: string, apiKey: string, body?: unknown): Promise<Response> {
	const response = await fetch(`${APP_URL}/api/openapi${path}`, {
		method: body === undefined ? "GET" : "POST",
		credentials: "omit",
		headers: { "x-api-key": apiKey, ...(body === undefined ? {} : { "content-type": "application/json" }) },
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
	if (response.ok) return response;

	const message = await response
		.json()
		.then((error: { message?: string }) => error.message)
		.catch(() => undefined);
	throw new ApiError(message ?? `Request failed (${response.status})`, response.status);
}

export const api = {
	/** Contact details from the Information Bank. Fails with 401 for a bad key and 400 while the bank is empty. */
	profile: async (apiKey: string): Promise<Profile> => (await request("/autofill/profile", apiKey)).json(),

	generate: async (apiKey: string, type: DocumentType, job: Job): Promise<GeneratedDocument> => {
		const payload = {
			jobTitle: job.title.slice(0, 200),
			jobDescription: job.description.slice(0, 20_000),
			...(job.company ? { companyName: job.company.slice(0, 200) } : {}),
		};
		const response = await request(
			type === "resume" ? "/resumes/generations" : "/cover-letters/generations",
			apiKey,
			payload,
		);
		const { id, name } = (await response.json()) as { id: string; name: string };
		return { id, name, type };
	},

	pdf: async (apiKey: string, document: GeneratedDocument): Promise<Blob> => {
		const path =
			document.type === "resume" ? `/resumes/${document.id}/pdf` : `/cover-letters/${document.id}/exports/pdf`;
		return (await request(path, apiKey)).blob();
	},

	answer: async (apiKey: string, questions: Question[], job: Job): Promise<Answer[]> => {
		const response = await request("/autofill/questions", apiKey, {
			questions,
			page_url: job.url,
			job_context: { title: job.title, company: job.company, description: job.description.slice(0, 20_000) },
		});
		return ((await response.json()) as { answers: Answer[] }).answers;
	},
};

/** Where a generated document opens in the Reactive Resume editor. */
export const editorUrl = (document: GeneratedDocument) =>
	appUrl(document.type === "resume" ? `/builder/${document.id}` : `/builder/letter/${document.id}`);
