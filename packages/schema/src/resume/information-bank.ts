import type { CustomSection, ResumeData } from "./data";
import z from "zod";
import {
	awardItemSchema,
	basicsSchema,
	certificationItemSchema,
	educationItemSchema,
	experienceItemSchema,
	interestItemSchema,
	languageItemSchema,
	profileItemSchema,
	projectItemSchema,
	publicationItemSchema,
	referenceItemSchema,
	skillItemSchema,
	volunteerItemSchema,
} from "./data";
import { syncResumeDates } from "./dates";
import { defaultResumeData } from "./default";

// Fork feature: the Information Bank is everything a user could put on a resume, kept apart from any one
// resume. Tailored resumes, cover letters and form answers are generated from it. It has no template, layout
// or design: only content, in the same entry shapes resume sections use, plus free-form notes.

const MAX_ENTRIES = 500;
const MAX_TEXT_CHARS = 200_000;
const entries = <T extends z.ZodType>(item: T) => z.array(item).max(MAX_ENTRIES);

const bankSectionsSchema = z.object({
	experience: entries(experienceItemSchema),
	education: entries(educationItemSchema),
	projects: entries(projectItemSchema),
	skills: entries(skillItemSchema),
	certifications: entries(certificationItemSchema),
	awards: entries(awardItemSchema),
	publications: entries(publicationItemSchema),
	volunteer: entries(volunteerItemSchema),
	languages: entries(languageItemSchema),
	interests: entries(interestItemSchema),
	profiles: entries(profileItemSchema),
	references: entries(referenceItemSchema),
});

export type BankSection = keyof z.infer<typeof bankSectionsSchema>;

/** The bank's sections, in the order its page lists them. */
export const BANK_SECTIONS = Object.keys(bankSectionsSchema.shape) as BankSection[];

const bankNoteSchema = z.object({
	id: z.string(),
	title: z.string().max(200),
	content: z.string().max(MAX_TEXT_CHARS).describe("Free-form facts as HTML: an FAQ, preferences, side projects."),
});

export type BankNote = z.infer<typeof bankNoteSchema>;

// No `.catch()` on the sections: a malformed save is rejected rather than stored with a section emptied.
export const informationBankSchema = z.object({
	basics: basicsSchema,
	summary: z.string().max(MAX_TEXT_CHARS).describe("Long-form professional summary as HTML."),
	sections: bankSectionsSchema,
	notes: z.array(bankNoteSchema).max(MAX_ENTRIES),
});

export type InformationBank = z.infer<typeof informationBankSchema>;

export const emptyInformationBank: InformationBank = {
	basics: defaultResumeData.basics,
	summary: "",
	sections: Object.fromEntries(BANK_SECTIONS.map((key) => [key, []])) as unknown as InformationBank["sections"],
	notes: [],
};

const isBlankHtml = (html: string) => !html.replace(/<[^>]*>/g, "").trim();

/** Nothing to generate from: no contact details, summary, entries or notes. */
export function isEmptyBank(bank: InformationBank) {
	const { website, customFields, ...text } = bank.basics;
	return (
		Object.values(text).every((value) => !value.trim()) &&
		!website.url.trim() &&
		customFields.length === 0 &&
		isBlankHtml(bank.summary) &&
		bank.notes.length === 0 &&
		BANK_SECTIONS.every((key) => bank.sections[key].length === 0)
	);
}

/**
 * Reads a stored bank. One that no longer fits the schema (an entry shape changed since it was saved) is
 * read part by part, so a single bad entry cannot lock the user out of everything else.
 */
// ponytail: an entry that fails is left out and is gone on the next save; keep the raw row somewhere if that ever bites.
export function parseStoredBank(stored: unknown): { bank: InformationBank; dropped: number } {
	const whole = informationBankSchema.safeParse(stored);
	if (whole.success) return { bank: whole.data, dropped: 0 };

	const raw = (stored ?? {}) as {
		basics?: unknown;
		summary?: unknown;
		sections?: Record<string, unknown>;
		notes?: unknown;
	};
	let dropped = 0;
	const keep = <T>(item: z.ZodType<T>, list: unknown): T[] =>
		(Array.isArray(list) ? list : []).slice(0, MAX_ENTRIES).flatMap((entry) => {
			const parsed = item.safeParse(entry);
			if (!parsed.success) dropped += 1;
			return parsed.success ? [parsed.data] : [];
		});

	// Contact details that no longer parse are kept field by field rather than blanked.
	const parsedBasics = basicsSchema.safeParse(raw.basics);
	const looseBasics = (raw.basics ?? {}) as Record<string, unknown>;
	const basics: InformationBank["basics"] = parsedBasics.success
		? parsedBasics.data
		: { ...emptyInformationBank.basics };
	if (!parsedBasics.success) {
		dropped += 1;
		for (const field of ["name", "headline", "email", "phone", "location"] as const) {
			if (typeof looseBasics[field] === "string") basics[field] = looseBasics[field];
		}
	}
	const summary = typeof raw.summary === "string" ? raw.summary : "";
	if (summary.length > MAX_TEXT_CHARS || (raw.summary != null && typeof raw.summary !== "string")) dropped += 1;
	const sections = Object.fromEntries(
		BANK_SECTIONS.map((key) => [key, keep(bankSectionsSchema.shape[key].element as z.ZodType, raw.sections?.[key])]),
	) as unknown as InformationBank["sections"];
	return {
		bank: {
			basics,
			summary: summary.slice(0, MAX_TEXT_CHARS),
			sections,
			notes: keep(bankNoteSchema, raw.notes),
		},
		dropped,
	};
}

/**
 * The bank as resume data on the default design, which is what generation works on. Each note becomes a
 * summary-type custom section that no page places: background for a model, never printed.
 */
export function toResumeData(bank: InformationBank): ResumeData {
	const data = structuredClone(defaultResumeData);
	data.basics = structuredClone(bank.basics);
	data.summary.content = bank.summary;
	for (const key of BANK_SECTIONS) (data.sections[key].items as unknown[]) = structuredClone(bank.sections[key]);
	data.customSections = bank.notes.map((note): CustomSection => ({
		id: note.id,
		type: "summary",
		title: note.title,
		icon: "",
		columns: 1,
		hidden: false,
		showHeading: true,
		keepTogether: false,
		startOnNewPage: false,
		items: [{ id: note.id, hidden: false, content: note.content }],
	}));
	// The bank keeps structured dates only; the text a resume prints is written from them here.
	syncResumeDates(data);
	return data;
}

/**
 * Adds a resume's content to the bank. Entries already in the bank (by id) are left alone, so importing the
 * same resume twice changes nothing. Basics and the summary are only filled where the bank's are blank.
 * Free-text custom sections become notes; custom sections of another type join the bank section of that type.
 */
export function importResume(bank: InformationBank, data: ResumeData): InformationBank {
	const next = structuredClone(bank);
	const seen = new Set(BANK_SECTIONS.flatMap((key) => next.sections[key].map((item) => item.id)));

	const add = (key: BankSection, items: readonly unknown[], sectionHidden: boolean) => {
		const item = bankSectionsSchema.shape[key].element;
		const target = next.sections[key] as unknown[];
		for (const raw of items) {
			const parsed = item.safeParse(raw);
			if (!parsed.success || seen.has(parsed.data.id) || target.length >= MAX_ENTRIES) continue;
			seen.add(parsed.data.id);
			target.push({ ...parsed.data, hidden: parsed.data.hidden || sectionHidden });
		}
	};

	for (const key of BANK_SECTIONS) add(key, data.sections[key].items, data.sections[key].hidden);

	const noteIds = new Set(next.notes.map((note) => note.id));
	for (const section of data.customSections) {
		if (section.type === "cover-letter") continue;
		if (section.type !== "summary") {
			add(section.type, section.items, section.hidden);
			continue;
		}
		// A hidden custom section was never used as background, so it is not brought in as a note.
		if (section.hidden || noteIds.has(section.id) || next.notes.length >= MAX_ENTRIES) continue;
		const content = section.items
			.filter((item) => !item.hidden)
			.map((item) => (item as { content?: unknown }).content)
			.filter((html): html is string => typeof html === "string")
			.join("");
		if (isBlankHtml(content)) continue;
		next.notes.push({ id: section.id, title: section.title.slice(0, 200), content });
	}

	const { website, customFields, ...text } = data.basics;
	for (const [field, value] of Object.entries(text) as [keyof typeof text, string][]) {
		if (!next.basics[field].trim()) next.basics[field] = value;
	}
	if (!next.basics.website.url.trim()) next.basics.website = { ...website };
	if (next.basics.customFields.length === 0) next.basics.customFields = structuredClone(customFields);
	if (isBlankHtml(next.summary)) next.summary = data.summary.content;

	return next;
}
