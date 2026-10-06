import type { Profile } from "./api";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyAutofill, extractFormFields, runHeuristics, toQuestions, toSuggestions } from "./autofill";

const profile: Profile = {
	basics: {
		fullName: "Ada Lovelace",
		headline: "Engineer",
		email: "ada@example.com",
		phone: "+44 20 7946 0000",
		location: { address: "London" },
		url: "https://ada.dev",
		linkedIn: "https://linkedin.com/in/ada",
	},
};

// happy-dom has no layout, so the tests supply one: controls are stacked 40px apart, visibility follows
// inline display, and a click lands on whichever control's box contains it unless that control is covered.
const box = (overrides: Partial<DOMRect> = {}) =>
	({ width: 200, height: 30, left: 10, top: 10, right: 210, bottom: 40, ...overrides }) as DOMRect;
const controls = () => Array.from(document.querySelectorAll<HTMLElement>("input, textarea, select"));
const covered = new WeakSet<Element>();

beforeEach(() => {
	vi.restoreAllMocks();
	Element.prototype.checkVisibility = function (this: HTMLElement) {
		return this.style.display !== "none";
	};
	Element.prototype.scrollIntoView = () => {};
	vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
		// Matched by name: happy-dom hands out a select as a proxy, so identity would miss it here.
		const name = this.getAttribute("name");
		const top =
			10 +
			40 *
				Math.max(
					0,
					controls().findIndex((control) => control.getAttribute("name") === name),
				);
		return box({ top, bottom: top + 30 });
	});
	document.elementFromPoint = (x, y) =>
		controls().find((element) => {
			const { left, right, top, bottom } = element.getBoundingClientRect();
			return !covered.has(element) && x >= left && x <= right && y >= top && y <= bottom;
		}) ?? document.body;
	document.body.innerHTML = `
		<form>
			<label for="email">Email address</label><input id="email" name="email" type="email">
			<label for="full">Full name</label><input id="full" name="candidate_name">
			<label for="li">LinkedIn profile</label><input id="li" name="social1">
			<label for="why">Why do you want to work here?</label><textarea id="why" name="why"></textarea>
			<label for="level">Seniority</label>
			<select id="level" name="level"><option value="">Choose</option><option value="3">Senior</option></select>
			<input name="csrf" type="hidden" value="t">
			<input name="pin" type="password">
			<input name="cv" type="file">
			<input name="terms" type="checkbox">
			<input name="honeypot" style="display: none">
			<input name="locked" disabled>
		</form>`;
});

describe("extractFormFields", () => {
	it("offers only visible, editable text fields and selects", () => {
		const fields = extractFormFields();
		expect(fields.map((field) => field.label)).toEqual([
			"Email address",
			"Full name",
			"LinkedIn profile",
			"Why do you want to work here?",
			"Seniority",
		]);
		expect(fields.at(-1)?.options).toEqual([
			{ label: "Choose", value: "" },
			{ label: "Senior", value: "3" },
		]);
	});

	it.each([
		["the browser reports it as not visible", (input: HTMLInputElement) => (input.checkVisibility = () => false)],
		[
			"it is collapsed to nothing",
			(input: HTMLInputElement) => (input.getBoundingClientRect = () => box({ width: 1, height: 1 })),
		],
		[
			"it is parked off-screen",
			(input: HTMLInputElement) => (input.getBoundingClientRect = () => box({ left: -9999, right: -9799 })),
		],
		[
			"visibility cannot be checked at all",
			(input: HTMLInputElement) => Reflect.set(input, "checkVisibility", undefined),
		],
		["something else is drawn over it", (input: HTMLInputElement) => covered.add(input)],
	])("skips a field when %s", (_case, hide) => {
		const email = document.querySelector<HTMLInputElement>("#email");
		if (!email) throw new Error("fixture");
		hide(email);
		expect(extractFormFields().map((field) => field.label)).not.toContain("Email address");
	});

	it("gives every pass fresh ids, so values approved for one pass cannot be applied after another", () => {
		const [first] = extractFormFields();
		const [second] = extractFormFields();
		if (!first || !second) throw new Error("fixture");

		expect(second.id).not.toBe(first.id);
		expect(applyAutofill([{ id: first.id, value: "stale@example.com" }])).toBe(0);
		expect(document.querySelector<HTMLInputElement>("#email")?.value).toBe("");
	});
});

describe("runHeuristics", () => {
	it("matches profile values by name and label, and leaves open questions alone", () => {
		const fields = extractFormFields();
		const byLabel = (id: string) => fields.find((field) => field.id === id)?.label;

		expect(runHeuristics(profile).map(({ id, value }) => [byLabel(id), value])).toEqual([
			["Full name", "Ada Lovelace"],
			["Email address", "ada@example.com"],
			["LinkedIn profile", "https://linkedin.com/in/ada"],
		]);
	});
});

describe("toQuestions and toSuggestions", () => {
	it("asks about labelled fields and maps a chosen option label back to its value", () => {
		const fields = extractFormFields().filter((field) =>
			["Why do you want to work here?", "Seniority"].includes(field.label),
		);
		const [why, level] = fields;
		if (!why || !level) throw new Error("fixture");

		expect(toQuestions(fields)).toEqual([
			{ id: why.id, question: "Why do you want to work here?", type: "textarea" },
			{ id: level.id, question: "Seniority", type: "select", options: ["Choose", "Senior"] },
		]);

		expect(
			toSuggestions(
				[
					{ question_id: why.id, value: "Because.", strategy: "AI_GENERATED" },
					{ question_id: level.id, value: "Senior", strategy: "AI_MAPPED" },
					{ question_id: "not-asked", value: "x", strategy: "AI_MAPPED" },
					{ question_id: why.id, value: ["a"], strategy: "AI_MAPPED" },
				],
				fields,
			),
		).toEqual([
			{ id: why.id, value: "Because.", strategy: "AI_GENERATED" },
			{ id: level.id, value: "3", strategy: "AI_MAPPED" },
		]);

		// An answer that is not one of the select's options is dropped, not written.
		expect(toSuggestions([{ question_id: level.id, value: "Principal", strategy: "AI_MAPPED" }], fields)).toEqual([]);
	});
});

describe("applyAutofill", () => {
	it("leaves a field empty if it is covered, or cannot be brought on screen, by the time values are applied", () => {
		const [email, name] = extractFormFields();
		const emailInput = document.querySelector<HTMLInputElement>("#email");
		const nameInput = document.querySelector<HTMLInputElement>("#full");
		if (!email || !name || !emailInput || !nameInput) throw new Error("fixture");

		covered.add(emailInput);
		nameInput.getBoundingClientRect = () => box({ top: 5000, bottom: 5030 });

		expect(
			applyAutofill([
				{ id: email.id, value: "ada@example.com" },
				{ id: name.id, value: "Ada" },
			]),
		).toBe(0);
		expect([emailInput.value, nameInput.value]).toEqual(["", ""]);
	});

	it("writes values, fires input events, and ignores ids that are not tagged fields", () => {
		const [email] = extractFormFields();
		const input = document.querySelector<HTMLInputElement>("#email");
		if (!email || !input) throw new Error("fixture");
		const onInput = vi.fn();
		input.addEventListener("input", onInput);

		expect(
			applyAutofill([
				{ id: email.id, value: "ada@example.com" },
				{ id: 'x"] , [name="csrf', value: "leak" },
			]),
		).toBe(1);
		expect(input.value).toBe("ada@example.com");
		expect(onInput).toHaveBeenCalledOnce();
		expect(document.querySelector<HTMLInputElement>('[name="csrf"]')?.value).toBe("t");
	});
});
