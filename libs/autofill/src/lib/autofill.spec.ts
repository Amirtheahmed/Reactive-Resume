import { defaultInformation } from "@reactive-resume/schema";
import { describe, expect, it, beforeEach } from "vitest";
import { flattenInformation, autofillPage } from "./autofill";

// Mock DOM setup is handled by Vitest environment: jsdom
describe("Autofill Library", () => {
  const mockInfo = {
    ...defaultInformation,
    basics: {
      ...defaultInformation.basics,
      name: "John Doe",
      email: "john@example.com",
      phone: "1234567890",
      url: {
        label: "Portfolio",
        href: "https://johndoe.com"
      }
    }
  };

  describe("flattenInformation", () => {
    it("should flatten basic information into key-value pairs", () => {
      const result = flattenInformation(mockInfo);

      const nameEntry = result.find(r => r.value === "John Doe");
      expect(nameEntry).toBeDefined();
      expect(nameEntry?.keys).toContain("full name");

      const emailEntry = result.find(r => r.value === "john@example.com");
      expect(emailEntry).toBeDefined();
      expect(emailEntry?.keys).toContain("email");
    });
  });

  describe("autofillPage", () => {
    beforeEach(() => {
      document.body.innerHTML = "";
    });

    it("should fill an input with exact name match", () => {
      const input = document.createElement("input");
      input.name = "email";
      document.body.appendChild(input);

      const count = autofillPage(mockInfo);

      expect(count).toBe(1);
      expect(input.value).toBe("john@example.com");
    });

    it("should fill an input based on label text proximity", () => {
      const container = document.createElement("div");
      const label = document.createElement("label");
      label.textContent = "Full Name";
      const input = document.createElement("input");
      input.name = "field_123"; // obscure name

      container.appendChild(label);
      container.appendChild(input);
      document.body.appendChild(container);

      const count = autofillPage(mockInfo);

      expect(count).toBe(1);
      expect(input.value).toBe("John Doe");
    });

    it("should visually highlight filled fields", () => {
      const input = document.createElement("input");
      input.name = "phone";
      document.body.appendChild(input);

      autofillPage(mockInfo);

      expect(input.style.backgroundColor).toBe("rgb(230, 255, 250)"); // #e6fffa in RGB
    });

    it("should ignore hidden inputs", () => {
      const input = document.createElement("input");
      input.name = "email";
      input.type = "hidden";
      document.body.appendChild(input);

      const count = autofillPage(mockInfo);

      expect(count).toBe(0);
      expect(input.value).toBe("");
    });
  });
});
