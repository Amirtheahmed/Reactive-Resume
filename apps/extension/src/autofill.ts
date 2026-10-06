import type { Answer, Profile, Question } from "./api";

// Runs inside the job page (content script): finds the form's fields, matches the obvious ones to the
// profile locally, and fills the values the user approved in the side panel.

type FormControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

export type FormField = {
	id: string;
	label: string;
	tagName: "input" | "textarea" | "select";
	type: string;
	options?: { label: string; value: string }[];
};

export type Suggestion = { id: string; value: string };

const FIELD_ID = "data-rx-autofill-id";
/** Input types that are never filled: not text, or not the user's to hand over. */
const SKIPPED_TYPES = new Set([
	"hidden",
	"password",
	"file",
	"checkbox",
	"radio",
	"submit",
	"button",
	"reset",
	"image",
]);

const normalise = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Smallest box, in CSS pixels, that still counts as a field someone could click into. */
const MIN_FIELD_SIZE = 8;

// Only fields a person can see are offered. A page can hide an input to harvest autofilled data
// (display, visibility, opacity, zero size, parked off-screen), which the server cannot detect from HTML
// alone; the browser can. Anything this cannot positively confirm as visible is treated as hidden.
// It does not detect a field covered by another element; the review step is the backstop for that.
function isVisible(element: FormControl): boolean {
	if (typeof element.checkVisibility !== "function") return false;
	if (!element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true, contentVisibilityAuto: true }))
		return false;

	const box = element.getBoundingClientRect();
	const page = document.documentElement;
	return (
		box.width >= MIN_FIELD_SIZE &&
		box.height >= MIN_FIELD_SIZE &&
		box.right > 0 &&
		box.bottom + window.scrollY > 0 &&
		box.left < Math.max(page.scrollWidth, window.innerWidth) &&
		box.top + window.scrollY < Math.max(page.scrollHeight, window.innerHeight)
	);
}

const labelOf = (element: FormControl) => {
	const labels = Array.from(element.labels ?? []);
	if (labels.length > 0)
		return labels
			.map((label) => label.textContent ?? "")
			.join(" ")
			.trim();
	return (element.parentElement?.textContent ?? "").trim().split("\n")[0]?.trim() ?? "";
};

/**
 * Tags every visible, fillable control on the page with an id and describes it. The ids carry a random
 * token made for this pass, so approved values can only ever land in the page and the pass they were
 * reviewed for: on any other page, or after another pass, no element has them.
 */
export function extractFormFields(): FormField[] {
	const fields: FormField[] = [];
	const pass = crypto.randomUUID();

	for (const element of document.querySelectorAll<FormControl>("input, textarea, select")) {
		element.removeAttribute(FIELD_ID);
		if (SKIPPED_TYPES.has(element.type) || element.disabled || !isVisible(element)) continue;
		if (!(element instanceof HTMLSelectElement) && element.readOnly) continue;

		const id = `rx-${pass}-${fields.length}`;
		element.setAttribute(FIELD_ID, id);

		fields.push({
			id,
			label: labelOf(element).slice(0, 300),
			tagName: element.tagName.toLowerCase() as FormField["tagName"],
			type: element.type,
			...(element instanceof HTMLSelectElement
				? {
						options: Array.from(element.options).map((option) => ({
							label: option.label || option.text,
							value: option.value,
						})),
					}
				: {}),
		});
	}

	return fields;
}

/** The profile as values with the words a form is likely to use for each. */
const profileValues = ({ basics }: Profile): { keys: string[]; value: string | undefined }[] => [
	{ keys: ["full name", "your name", "candidate name", "name"], value: basics.fullName },
	{ keys: ["email", "e-mail", "email address"], value: basics.email },
	{ keys: ["phone", "mobile", "cell", "contact number", "telephone"], value: basics.phone },
	{ keys: ["headline", "current role", "current title", "profession"], value: basics.headline },
	{ keys: ["location", "address", "city", "current location"], value: basics.location.address },
	{ keys: ["website", "portfolio", "personal site", "url"], value: basics.url },
	{ keys: ["linkedin", "linked in"], value: basics.linkedIn },
	{ keys: ["github"], value: basics.github },
	{ keys: ["twitter", "x.com"], value: basics.twitter },
];

function score(element: FormControl, keys: string[]): number {
	const exact = [element.name, element.id, element.getAttribute("autocomplete") ?? ""].map(normalise);
	const loose = [
		...exact,
		normalise(element.getAttribute("aria-label") ?? ""),
		normalise(element.getAttribute("placeholder") ?? ""),
		normalise(labelOf(element)),
	];

	let total = 0;
	for (const key of keys.map(normalise)) {
		if (exact.includes(key)) total += 10;
		if (loose.some((text) => text.includes(key))) total += 5;
	}
	return total;
}

/** Matches profile values to tagged fields by name, id and label. No network, no AI. */
export function runHeuristics(profile: Profile): Suggestion[] {
	const elements = Array.from(document.querySelectorAll<FormControl>(`[${FIELD_ID}]`));
	const taken = new Set<FormControl>();
	const suggestions: Suggestion[] = [];

	for (const { keys, value } of profileValues(profile)) {
		if (!value) continue;

		let best: FormControl | undefined;
		let bestScore = 5; // a single loose match is not enough
		for (const element of elements) {
			if (taken.has(element) || element instanceof HTMLSelectElement) continue;
			const elementScore = score(element, keys);
			if (elementScore > bestScore) {
				best = element;
				bestScore = elementScore;
			}
		}

		const id = best?.getAttribute(FIELD_ID);
		if (best && id) {
			taken.add(best);
			suggestions.push({ id, value });
		}
	}

	return suggestions;
}

const QUESTION_TYPES: Record<string, Question["type"]> = {
	email: "email",
	tel: "phone",
	url: "url",
	number: "number",
	date: "date",
};

/** Fields the heuristics left over, as questions for the server. Unlabelled fields cannot be asked about. */
export function toQuestions(fields: FormField[]): Question[] {
	return fields
		.filter((field) => field.label)
		.slice(0, 50)
		.map((field) => ({
			id: field.id,
			question: field.label,
			type: field.tagName === "input" ? (QUESTION_TYPES[field.type] ?? "text") : field.tagName,
			// The model picks among the visible labels; the label is turned back into the option's value below.
			...(field.options ? { options: field.options.map((option) => option.label).slice(0, 200) } : {}),
		}));
}

/** Server answers as fill suggestions, dropping anything that is not a plain value for a field that was asked. */
export function toSuggestions(answers: Answer[], fields: FormField[]): (Suggestion & { strategy: string })[] {
	return answers.flatMap(({ question_id, value, strategy }) => {
		const field = fields.find(({ id }) => id === question_id);
		if (!field || (typeof value !== "string" && typeof value !== "number")) return [];

		const text = String(value);
		if (!field.options) return text ? [{ id: field.id, value: text, strategy }] : [];

		const option = field.options.find(({ label, value: optionValue }) => label === text || optionValue === text);
		return option ? [{ id: field.id, value: option.value, strategy }] : [];
	});
}

/** Writes approved values into their fields, the way typing would, so framework-controlled inputs notice. */
export function applyAutofill(suggestions: Suggestion[]): number {
	// Looked up by comparing the attribute, so an id is never interpolated into a selector.
	const tagged = new Map(
		Array.from(document.querySelectorAll<FormControl>(`[${FIELD_ID}]`), (element) => [
			element.getAttribute(FIELD_ID),
			element,
		]),
	);
	let filled = 0;

	for (const { id, value } of suggestions) {
		const element = tagged.get(id);
		if (!element || SKIPPED_TYPES.has(element.type) || !isVisible(element)) continue;

		// React and friends replace the instance's value property; the prototype's setter reaches the real one.
		const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), "value")?.set;
		if (setter) setter.call(element, value);
		else element.value = value;

		for (const type of ["input", "change", "blur"]) element.dispatchEvent(new Event(type, { bubbles: true }));
		filled++;
	}

	return filled;
}
