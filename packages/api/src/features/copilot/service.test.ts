import { describe, expect, it } from "vitest";
import { coverLetterDocumentSchema } from "@reactive-resume/schema/cover-letter/data";
import { emptyInformationBank, importResume, toResumeData } from "@reactive-resume/schema/resume/information-bank";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";

const { applyTailoring, autofillProfile, bankLetterDocument, createFormResolver, profileForPrompt, tailoringSchema } =
	await import("./service");

const master = () => structuredClone(sampleResumeData);

describe("applyTailoring", () => {
	it("keeps only the selected entries, in the master's order, with facts from the master", () => {
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

		expect(result.sections.experience.items.map((item) => item.id)).toEqual([first.id, second.id]);
		expect(result.sections.experience.items[1]).toMatchObject({
			company: second.company,
			period: second.period,
			description: "<ul><li>Rewritten</li></ul>",
		});
		// An empty rewrite keeps the master's text rather than blanking the entry.
		expect(result.sections.experience.items[0]?.description).toBe(first.description);
		expect(result.sections.projects.items).toEqual([]);
		expect(result.sections.skills.items.map((item) => [item.name, item.keywords])).toEqual([["Backend", ["Node.js"]]]);
		expect(result.summary.hidden).toBe(true);
		expect(result.metadata.template).toBe("goldstar");
	});

	it("keeps the master's custom sections out of the tailored resume and its layout", () => {
		const data = master();
		const [first] = data.sections.experience.items;
		if (!first) throw new Error("sample data needs an experience entry");
		data.customSections.push({
			id: "faq",
			type: "summary",
			title: "FAQ",
			icon: "",
			columns: 1,
			hidden: false,
			keepTogether: false,
			startOnNewPage: false,
			items: [{ id: "faq-1", hidden: false, content: "<p>Based in Istanbul.</p>" }],
		} as never);
		data.metadata.layout.pages[0]?.main.push("faq");

		const result = applyTailoring(
			data,
			tailoringSchema.parse({ experience: [{ id: first.id, description: "" }] }),
			"goldstar",
		);

		expect(result.customSections).toEqual([]);
		expect(result.metadata.layout.pages.flatMap((page) => [...page.main, ...page.sidebar])).not.toContain("faq");
		// The master itself still has it, and the model still gets to read it.
		expect(JSON.parse(profileForPrompt(data, { background: false })).background).toEqual([]);
		expect(JSON.parse(profileForPrompt(data)).background).toContainEqual({
			title: "FAQ",
			items: [{ content: "<p>Based in Istanbul.</p>" }],
		});
	});

	it("takes projects from the background, rewrites education and lays goldstar out in one column", () => {
		const data = master();
		const [first] = data.sections.experience.items;
		const [degree] = data.sections.education.items;
		if (!first || !degree) throw new Error("sample data needs experience and education");
		degree.description = "<p>A long first-person account of the degree.</p>";
		data.customSections = [
			{
				...(data.customSections[0] as object),
				id: "notes",
				type: "summary",
				title: "Projects",
				hidden: false,
				items: [{ id: "n1", hidden: false, content: "<h3><strong>Homelab</strong></h3><p>A k3s cluster.</p>" }],
			} as never,
		];

		const result = applyTailoring(
			data,
			tailoringSchema.parse({
				experience: [{ id: first.id, description: "" }],
				projects: [
					{ name: "homelab ", description: "<ul><li>Built a cluster</li></ul>" },
					{ name: "Invented Startup", description: "<ul><li>Not in the notes</li></ul>" },
					{ name: "k3s cluster", description: "<ul><li>A phrase from the notes, not a title</li></ul>" },
					{ name: "No description" },
					{ id: "not-in-master", name: "", description: "<ul><li>Nameless</li></ul>" },
				],
				education: [{ id: "not-in-master", description: "<p>Invented</p>" }],
			}),
			"goldstar",
		);

		expect(result.sections.projects.items.map((item) => item.name)).toEqual(["Homelab"]);
		expect(result.sections.education.items).toHaveLength(data.sections.education.items.length);
		expect(result.sections.education.items.every((item) => item.description === "")).toBe(true);
		expect(result.metadata.layout.pages).toHaveLength(1);
		expect(result.metadata.layout.pages[0]).toMatchObject({ fullWidth: true, sidebar: [] });
		expect(result.metadata.layout.pages[0]?.main.slice(0, 5)).toEqual([
			"summary",
			"experience",
			"projects",
			"skills",
			"education",
		]);
		expect(result.metadata.layout.pages[0]?.main).not.toContain("profiles");
		const links = data.sections.profiles.items.filter((item) => !item.hidden && item.website.url);
		expect(result.basics.customFields.map((field) => field.link)).toEqual(
			expect.arrayContaining(links.map((item) => item.website.url)),
		);
		// Another template keeps the master's own layout.
		const other = applyTailoring(data, tailoringSchema.parse({ experience: [{ id: first.id }] }), "onyx");
		expect(other.metadata.layout.pages).toHaveLength(data.metadata.layout.pages.length);
		expect(other.metadata.layout.pages[0]?.fullWidth).toBe(data.metadata.layout.pages[0]?.fullWidth);
	});

	it("strips links, scripts and attributes from the model's text", () => {
		const parsed = tailoringSchema.parse({
			summary: '<p onclick="x()">Hi <a href="https://evil.example">here</a><script>alert(1)</script></p>',
			experience: [{ id: "a", description: '<ul><li style="color:red">Did <img src=x onerror=y> it</li></ul>' }],
			projects: [{ name: "<b>Lab</b>", description: "<ul><li>ok</li></ul>" }],
			skills: [{ name: "Back<i>end</i>", keywords: ["<a href='x'>Node.js</a>"] }],
		});
		expect(parsed.summary).toBe("<p>Hi here</p>");
		expect(parsed.experience[0]?.description).toBe("<ul><li>Did  it</li></ul>");
		expect(parsed.projects[0]?.name).toBe("Lab");
		expect(parsed.skills).toEqual([{ name: "Backend", keywords: ["Node.js"] }]);
	});

	it("caps the selection and rejects a reply that selects no experience", () => {
		const data = master();
		const many = Array.from({ length: 9 }, () => ({ id: data.sections.experience.items[0]?.id, description: "x" }));
		expect(tailoringSchema.parse({ experience: many }).experience).toHaveLength(6);
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
	it("never sends a references section, whatever type it was created as", () => {
		const data = master();
		data.customSections.push({
			id: "refs",
			type: "summary",
			title: "My References",
			icon: "",
			columns: 1,
			hidden: false,
			keepTogether: false,
			startOnNewPage: false,
			items: [{ id: "r1", hidden: false, content: "<p>Jane Roe, +1 555 0100</p>" }],
		} as never);

		expect(profileForPrompt(data)).not.toContain("Jane Roe");
	});

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

describe("createFormResolver", () => {
	const resolve = createFormResolver(`
		<form id="apply">
			<input id="email" name="email" type="email">
			<input id="csrf" name="token" type="hidden">
			<input name=pin type='password'>
			<input id="trap" name="trap" hidden>
			<div style="display: none"><input id="honeypot" name="website"></div>
			<input id="shadow" type="text"><input id="shadow" type="hidden">
			<input name="plan" type="radio" value="a"><input name="plan" type="radio" value="b">
			<textarea name="why"></textarea>
			<select id="level" name="level"><option value="1">One</option></select>
			<input type=hidden data-x=">" id="tricky">
		</form>`);

	it.each([
		["#email", '[id="email"]'],
		['input[name="email"]', '[id="email"]'],
		["[name=why]", '[name="why"]'],
		["#apply #level", '[id="level"]'],
		["form > textarea", '[name="why"]'],
	])("resolves a visible control: %s", (selector, canonical) => expect(resolve(selector)).toBe(canonical));

	// The model's own claim about a field's type is never consulted: only the parsed form is.
	it.each([
		"#csrf",
		'[name="token"]',
		"[name=pin]",
		"#trap",
		"#honeypot",
		"#shadow",
		"#tricky",
		"[name=plan]",
		"#apply",
		"form input",
		"#email, #csrf",
		"#missing",
		"input[",
		"*",
	])("refuses a hidden, ambiguous, unknown or malformed target: %s", (selector) =>
		expect(resolve(selector)).toBeNull(),
	);
});

describe("the Information Bank as a profile", () => {
	it("offers its notes as background and keeps referees to itself", () => {
		const bank = importResume(emptyInformationBank, { ...sampleResumeData, customSections: [] });
		const [job] = bank.sections.experience;
		if (!job) throw new Error("sample data needs experience");
		bank.notes = [
			{ id: "labs", title: "Side projects", content: "<h3>Homelab</h3><p>A k3s cluster.</p>" },
			{ id: "refs", title: "References", content: "<p>Dana Referee, 555 0100</p>" },
			{ id: "prefs", title: "Preferences", content: "<p>Remote only, four-day week</p>" },
		];
		bank.sections.references = [
			{
				id: "r1",
				hidden: false,
				name: "Riley Referee",
				position: "",
				website: { url: "", label: "", inlineLink: false },
				phone: "555 0199",
				description: "",
			},
		];
		const profile = toResumeData(bank);

		const prompt = profileForPrompt(profile);
		expect(prompt).toContain("Homelab");
		expect(prompt).toContain("four-day week");
		expect(prompt).not.toContain("Referee");
		expect(profileForPrompt(profile, { background: false })).not.toContain("Homelab");

		const result = applyTailoring(
			profile,
			tailoringSchema.parse({
				experience: [{ id: job.id, description: "<ul><li>Built it</li></ul>" }],
				projects: [
					{ name: "homelab", description: "<ul><li>Ran k3s</li></ul>" },
					{ name: "Invented", description: "<ul><li>No</li></ul>" },
				],
			}),
			"goldstar",
		);
		expect(result.sections.projects.items.map((item) => item.name)).toEqual(["Homelab"]);
		expect(result.customSections).toEqual([]);
	});

	it("saves a letter that carries the bank's sender", () => {
		const profile = toResumeData(importResume(emptyInformationBank, sampleResumeData));
		const document = coverLetterDocumentSchema.parse(
			bankLetterDocument(profile, {
				name: "Engineer @ Orbital",
				content: "<p>Dear team</p>",
				recipientCompany: "Orbital",
			}),
		);
		expect(document.style.basics.name).toBe(sampleResumeData.basics.name);
		expect(document).toMatchObject({ layout: "structured", recipientCompany: "Orbital" });
	});
});
