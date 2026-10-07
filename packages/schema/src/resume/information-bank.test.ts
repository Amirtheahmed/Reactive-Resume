import { describe, expect, it } from "vitest";
import {
	emptyInformationBank,
	importResume,
	informationBankSchema,
	isEmptyBank,
	parseStoredBank,
	toResumeData,
} from "./information-bank";
import { sampleResumeData } from "./sample";
import { parseResumeDataForWrite } from "./write";

describe("importResume", () => {
	it("adds a resume's entries once and keeps what the bank already says", () => {
		const started = { ...emptyInformationBank, basics: { ...emptyInformationBank.basics, name: "Mine" } };
		const once = importResume(started, sampleResumeData);

		expect(once.basics.name).toBe("Mine");
		expect(once.basics.email).toBe(sampleResumeData.basics.email);
		// The sample's experience-typed custom section joins the bank's experience.
		const extra = sampleResumeData.customSections.filter((section) => section.type === "experience");
		expect(once.sections.experience).toHaveLength(
			sampleResumeData.sections.experience.items.length + extra.flatMap((section) => section.items).length,
		);
		expect(informationBankSchema.parse(once)).toEqual(once);
		expect(importResume(once, sampleResumeData)).toEqual(once);
	});

	it("turns free-text custom sections into notes", () => {
		const { customSections } = toResumeData({
			...emptyInformationBank,
			notes: [{ id: "faq", title: "FAQ", content: "<p>Remote</p>" }],
		});
		const bank = importResume(emptyInformationBank, { ...sampleResumeData, customSections });
		expect(bank.notes).toEqual([{ id: "faq", title: "FAQ", content: "<p>Remote</p>" }]);
	});
});

describe("reading a stored bank", () => {
	it("counts a bank with only notes or a summary as having something in it", () => {
		const notes = [{ id: "n", title: "FAQ", content: "<p>Remote</p>" }];
		expect(isEmptyBank({ ...emptyInformationBank, notes })).toBe(false);
		expect(isEmptyBank({ ...emptyInformationBank, summary: "<p>Engineer</p>" })).toBe(false);
		expect(isEmptyBank({ ...emptyInformationBank, summary: "<p></p>" })).toBe(true);
	});

	it("drops only the entry that no longer fits, keeping the rest", () => {
		const bank = importResume(emptyInformationBank, sampleResumeData);
		const stored = structuredClone(bank) as unknown as { sections: { experience: unknown[] } };
		stored.sections.experience.push({ broken: true });

		const read = parseStoredBank(stored);
		expect(read.dropped).toBe(1);
		expect(read.bank).toEqual(bank);
		expect(parseStoredBank(bank)).toEqual({ bank, dropped: 0 });

		const brokenBasics = { ...bank, basics: { ...bank.basics, customFields: "nope" } };
		const salvaged = parseStoredBank(brokenBasics);
		expect(salvaged.dropped).toBe(1);
		expect(salvaged.bank.basics.email).toBe(bank.basics.email);
	});
});

describe("toResumeData", () => {
	it("gives resume data that can be saved, with notes off the page and dates as text", () => {
		expect(isEmptyBank(emptyInformationBank)).toBe(true);
		const bank = importResume(emptyInformationBank, sampleResumeData);
		bank.notes.push({ id: "note", title: "FAQ", content: "<p>Remote only</p>" });
		const [job] = bank.sections.experience;
		if (!job) throw new Error("The sample resume has no experience.");
		job.period = "";
		job.dates = { start: "2020-03", end: null, present: true };

		const data = toResumeData(bank);

		expect(parseResumeDataForWrite(data)).toBeTruthy();
		expect(isEmptyBank(bank)).toBe(false);
		expect(data.customSections.map((section) => section.title)).toEqual(["FAQ"]);
		const placed = data.metadata.layout.pages.flatMap((page) => [...page.main, ...page.sidebar]);
		expect(placed).not.toContain("note");
		expect(data.sections.experience.items[0]?.period).toContain("2020");
	});
});
