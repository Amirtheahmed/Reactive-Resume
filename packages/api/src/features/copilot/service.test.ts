import { describe, expect, it, vi } from "vitest";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";

vi.mock("../resume/service", () => ({ resumeService: {} }));

const { applyTailoring, autofillProfile, profileForPrompt, tailoringSchema } = await import("./service");

const master = () => structuredClone(sampleResumeData);

describe("applyTailoring", () => {
	it("keeps only the selected entries, in the model's order, with facts from the master", () => {
		const data = master();
		const [first] = data.sections.experience.items;
		if (!first) throw new Error("sample data needs an experience entry");
		const second = { ...structuredClone(first), id: "second", company: "Second Co", period: "2019 – 2021" };
		data.sections.experience.items.push(second);

		const result = applyTailoring(
			data,
			tailoringSchema.parse({
				summary: "",
				experience: [
					{ id: second.id, description: "<ul><li>Rewritten</li></ul>" },
					{ id: "not-in-master", description: "<ul><li>Invented</li></ul>" },
					{ id: first.id, description: "" },
				],
				projects: [],
				skills: [{ name: "Backend", keywords: ["Node.js"] }],
			}),
			"goldstar",
		);

		expect(result.sections.experience.items.map((item) => item.id)).toEqual([second.id, first.id]);
		expect(result.sections.experience.items[0]).toMatchObject({
			company: second.company,
			period: second.period,
			description: "<ul><li>Rewritten</li></ul>",
		});
		// An empty rewrite keeps the master's text rather than blanking the entry.
		expect(result.sections.experience.items[1]?.description).toBe(first.description);
		expect(result.sections.projects.items).toEqual([]);
		expect(result.sections.skills.items.map((item) => [item.name, item.keywords])).toEqual([["Backend", ["Node.js"]]]);
		expect(result.summary.hidden).toBe(true);
		expect(result.metadata.template).toBe("goldstar");
	});

	it("caps the selection and rejects a reply that selects no experience", () => {
		const data = master();
		const many = Array.from({ length: 9 }, () => ({ id: data.sections.experience.items[0]?.id, description: "x" }));
		expect(tailoringSchema.parse({ experience: many }).experience).toHaveLength(4);
		expect(() => applyTailoring(data, tailoringSchema.parse({ experience: [{ id: "nope" }] }), "goldstar")).toThrow(
			/did not select any experience/,
		);
	});
});

describe("autofillProfile", () => {
	it("splits the name and finds profile links", () => {
		const data = master();
		data.basics.name = "Ada King Lovelace";
		const { basics } = autofillProfile(data);

		expect(basics).toMatchObject({ fullName: "Ada King Lovelace", firstName: "Ada", lastName: "King Lovelace" });
		expect(basics.linkedIn).toContain("linkedin");
		expect(basics.github).toContain("github");
	});
});

describe("profileForPrompt", () => {
	it("leaves out hidden entries and presentation settings", () => {
		const data = master();
		const hidden = data.sections.experience.items[0];
		if (!hidden) throw new Error("sample data needs an experience entry");
		hidden.hidden = true;

		const prompt = profileForPrompt(data);
		expect(prompt).not.toContain(hidden.id);
		expect(prompt).not.toContain('"metadata"');
		expect(prompt).not.toContain('"references"');
		expect(JSON.parse(prompt).basics.name).toBe(data.basics.name);
	});
});
