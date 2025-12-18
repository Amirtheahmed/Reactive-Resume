/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach } from "vitest";
import { flattenInformation, extractFormFields, applyAutofill, runHeuristics } from "./autofill";

// Create mock information data directly instead of importing from @reactive-resume/schema
// to avoid module resolution issues with vitest
const createMockInformation = () => ({
  basics: {
    name: "John Doe",
    email: "john@example.com",
    phone: "1234567890",
    headline: "Software Engineer",
    location: "San Francisco, CA",
    url: {
      label: "Portfolio",
      href: "https://johndoe.com"
    },
    picture: {
      url: "",
      size: 64,
      aspectRatio: 1,
      borderRadius: 0,
      effects: { hidden: false, border: false, grayscale: false },
    },
    customFields: [],
  },
  sections: {
    profiles: { name: "Profiles", columns: 1, visible: true, items: [] },
    experience: { name: "Experience", columns: 1, visible: true, items: [] },
    education: { name: "Education", columns: 1, visible: true, items: [] },
    skills: { name: "Skills", columns: 1, visible: true, items: [] },
    certifications: { name: "Certifications", columns: 1, visible: true, items: [] },
    languages: { name: "Languages", columns: 1, visible: true, items: [] },
    interests: { name: "Interests", columns: 1, visible: true, items: [] },
    projects: { name: "Projects", columns: 1, visible: true, items: [] },
    publications: { name: "Publications", columns: 1, visible: true, items: [] },
    volunteer: { name: "Volunteer", columns: 1, visible: true, items: [] },
    references: { name: "References", columns: 1, visible: true, items: [] },
    awards: { name: "Awards", columns: 1, visible: true, items: [] },
    summary: { name: "Summary", columns: 1, visible: true, content: "" },
  },
  custom: [],
});

describe("Autofill Library", () => {
  const mockInfo = createMockInformation();

  describe("flattenInformation", () => {
    it("should flatten basic information into key-value pairs", () => {
      const result = flattenInformation(mockInfo as any);

      const nameEntry = result.find(r => r.value === "John Doe");
      expect(nameEntry).toBeDefined();
      expect(nameEntry?.keys).toContain("full name");

      const emailEntry = result.find(r => r.value === "john@example.com");
      expect(emailEntry).toBeDefined();
      expect(emailEntry?.keys).toContain("email");
    });

    it("should include phone number in flattened data", () => {
      const result = flattenInformation(mockInfo as any);

      const phoneEntry = result.find(r => r.value === "1234567890");
      expect(phoneEntry).toBeDefined();
      expect(phoneEntry?.keys).toContain("phone");
    });

    it("should include url in flattened data", () => {
      const result = flattenInformation(mockInfo as any);

      const urlEntry = result.find(r => r.value === "https://johndoe.com");
      expect(urlEntry).toBeDefined();
      expect(urlEntry?.keys).toContain("website");
    });
  });

  describe("extractFormFields", () => {
    beforeEach(() => {
      document.body.innerHTML = "";
    });

    it("should extract visible input fields", () => {
      const form = document.createElement("form");
      const input = document.createElement("input");
      input.name = "email";
      input.type = "text";
      form.appendChild(input);
      document.body.appendChild(form);

      const fields = extractFormFields();

      expect(fields).toHaveLength(1);
      expect(fields[0].tagName).toBe("input");
    });

    it("should skip hidden inputs", () => {
      const input = document.createElement("input");
      input.name = "email";
      input.type = "hidden";
      document.body.appendChild(input);

      const fields = extractFormFields();

      expect(fields).toHaveLength(0);
    });

    it("should tag elements with data-rx-autofill-id", () => {
      const form = document.createElement("form");
      const input = document.createElement("input");
      input.name = "email";
      input.type = "text";
      form.appendChild(input);
      document.body.appendChild(form);

      extractFormFields();

      expect(input.getAttribute("data-rx-autofill-id")).toBeDefined();
    });
  });

  describe("applyAutofill", () => {
    beforeEach(() => {
      document.body.innerHTML = "";
    });

    it("should fill input fields based on id mapping", () => {
      const input = document.createElement("input");
      input.setAttribute("data-rx-autofill-id", "rx-autofill-0");
      document.body.appendChild(input);

      const count = applyAutofill([{ id: "rx-autofill-0", value: "john@example.com" }]);

      expect(count).toBe(1);
      expect(input.value).toBe("john@example.com");
    });

    it("should visually highlight filled fields", () => {
      const input = document.createElement("input");
      input.setAttribute("data-rx-autofill-id", "rx-autofill-0");
      document.body.appendChild(input);

      applyAutofill([{ id: "rx-autofill-0", value: "test@example.com" }]);

      expect(input.style.backgroundColor).toBe("rgb(230, 255, 250)"); // #e6fffa in RGB
    });

    it("should return 0 if element not found", () => {
      const count = applyAutofill([{ id: "non-existent", value: "test" }]);

      expect(count).toBe(0);
    });
  });

  describe("runHeuristics", () => {
    beforeEach(() => {
      document.body.innerHTML = "";
    });

    it("should match input fields based on name attribute", () => {
      // Create a proper form structure
      const form = document.createElement("form");
      form.textContent = "";  // Ensure textContent is set
      const input = document.createElement("input");
      input.name = "email";
      input.type = "text";
      input.setAttribute("data-rx-autofill-id", "rx-autofill-0");
      form.appendChild(input);
      document.body.appendChild(form);

      const suggestions = runHeuristics(mockInfo as any);

      const emailSuggestion = suggestions.find(s => s.value === "john@example.com");
      expect(emailSuggestion).toBeDefined();
    });

    it("should match input fields based on label proximity", () => {
      const form = document.createElement("form");
      const label = document.createElement("label");
      label.textContent = "Full Name";
      const input = document.createElement("input");
      input.name = "field_123";
      input.type = "text";
      input.setAttribute("data-rx-autofill-id", "rx-autofill-0");

      // Associate input with label properly
      input.id = "name-field";
      label.setAttribute("for", "name-field");

      form.appendChild(label);
      form.appendChild(input);
      document.body.appendChild(form);

      const suggestions = runHeuristics(mockInfo as any);

      const nameSuggestion = suggestions.find(s => s.value === "John Doe");
      expect(nameSuggestion).toBeDefined();
    });
  });
});

