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

/**
 * The fields found by the latest scan, by id. This lives in the content script, which the page's own
 * scripts cannot read or change: nothing about a scan is written into the DOM, so a page cannot move an
 * approved value onto another element. Each entry remembers the label the user was shown.
 */
let scanned = new Map<string, { element: FormControl; label: string }>();
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
/** Below this combined opacity a field is treated as invisible. */
const MIN_OPACITY = 0.5;

// Only fields a person can see are offered. A page can hide an input to harvest autofilled data
// (display, visibility, opacity, zero size, parked off-screen), which the server cannot detect from HTML
// alone; the browser can. Anything this cannot positively confirm as visible is treated as hidden.
function isVisible(element: FormControl): boolean {
	if (typeof element.checkVisibility !== "function") return false;
	if (!element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true, contentVisibilityAuto: true }))
		return false;

	// A nearly transparent field is as good as hidden, and opacity multiplies down the tree.
	let opacity = 1;
	for (let node: Element | null = element; node; node = node.parentElement) {
		const own = Number.parseFloat(getComputedStyle(node).opacity);
		if (!Number.isNaN(own)) opacity *= own;
	}
	if (opacity < MIN_OPACITY) return false;

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
 * True when clicks across the field would land on the field itself, once it is scrolled into view. Five
 * points are tested (the centre and towards each corner), so a field that is covered, clipped by a
 * scrolling ancestor, inert, or only peeking out from under something does not pass.
 */
function isHittable(element: FormControl): boolean {
	element.scrollIntoView({ block: "center", behavior: "instant" });
	const box = element.getBoundingClientRect();

	return [
		[0.5, 0.5],
		[0.2, 0.25],
		[0.8, 0.25],
		[0.2, 0.75],
		[0.8, 0.75],
	].every(([fx = 0.5, fy = 0.5]) => {
		const x = box.left + box.width * fx;
		const y = box.top + box.height * fy;
		const onScreen = x >= 0 && y >= 0 && x < window.innerWidth && y < window.innerHeight;
		return onScreen && document.elementFromPoint(x, y) === element;
	});
}

/** Everything that must hold for a field at the moment it is offered, and again at the moment it is filled. */
const isFillable = (element: FormControl) =>
	element.isConnected &&
	!SKIPPED_TYPES.has(element.type) &&
	!element.disabled &&
	(element instanceof HTMLSelectElement || !element.readOnly) &&
	isVisible(element) &&
	isHittable(element);

/**
 * Finds every field on the page that a person could see and click into, and describes it. Checking that
 * means scrolling each field into view, so the page is put back where it was afterwards. Ids are random
 * per scan: values approved for one scan match nothing after another, or on another page.
 */
export function extractFormFields(): FormField[] {
	const fields: FormField[] = [];
	const pass = crypto.randomUUID();
	const { scrollX, scrollY } = window;
	scanned = new Map();

	for (const element of document.querySelectorAll<FormControl>("input, textarea, select")) {
		if (!isFillable(element)) continue;

		const id = `rx-${pass}-${fields.length}`;
		const label = labelOf(element).slice(0, 300);
		scanned.set(id, { element, label });

		fields.push({
			id,
			label,
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

	window.scrollTo(scrollX, scrollY);
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
	const taken = new Set<string>();
	const suggestions: Suggestion[] = [];

	for (const { keys, value } of profileValues(profile)) {
		if (!value) continue;

		let best: string | undefined;
		let bestScore = 5; // a single loose match is not enough
		for (const [id, { element }] of scanned) {
			if (taken.has(id) || element instanceof HTMLSelectElement) continue;
			const elementScore = score(element, keys);
			if (elementScore > bestScore) {
				best = id;
				bestScore = elementScore;
			}
		}

		if (best) {
			taken.add(best);
			suggestions.push({ id: best, value });
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

/**
 * Writes approved values into their fields, the way typing would, so framework-controlled inputs notice.
 * Every check made when the field was offered is made again here, immediately before the write, and the
 * field must still carry the label the user approved the value for. A field that fails is left empty.
 */
export function applyAutofill(suggestions: Suggestion[]): number {
	const { scrollX, scrollY } = window;
	let filled = 0;

	for (const { id, value } of suggestions) {
		const field = scanned.get(id);
		if (!field) continue;
		const { element, label } = field;
		if (labelOf(element).slice(0, 300) !== label || !isFillable(element)) continue;

		// React and friends replace the instance's value property; the prototype's setter reaches the real one.
		const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), "value")?.set;
		if (setter) setter.call(element, value);
		else element.value = value;

		for (const type of ["input", "change", "blur"]) element.dispatchEvent(new Event(type, { bubbles: true }));
		filled++;
	}

	window.scrollTo(scrollX, scrollY);
	return filled;
}
