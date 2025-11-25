// libs/autofill/src/lib/autofill.ts
import type { InformationData } from "@reactive-resume/schema";
import type { FormField } from "@reactive-resume/dto";

type FieldMapping = {
  keys: string[];
  value: string;
};

// Heuristics mapping: Resume Keys -> DOM Keywords
const HEURISTICS: Record<string, string[]> = {
  // Basics
  "basics.name": ["full name", "your name", "candidate name", "name"],
  "basics.email": ["email", "e-mail", "email address"],
  "basics.phone": ["phone", "mobile", "cell", "contact number", "telephone"],
  "basics.headline": ["headline", "title", "current role", "profession"],
  "basics.location": ["location", "address", "city", "current location"],
  "basics.url.href": ["website", "portfolio", "personal site", "url"],

  // Socials (Simplified)
  "basics.linkedin": ["linkedin", "linked in"],
  "basics.github": ["github", "git"],
  "basics.twitter": ["twitter", "x.com"],
};

// Flatten the InformationData into a list of fillable values
export const flattenInformation = (data: InformationData): FieldMapping[] => {
  const mappings: FieldMapping[] = [];

  // Basics
  if (data.basics.name) mappings.push({ keys: HEURISTICS["basics.name"], value: data.basics.name });
  if (data.basics.email) mappings.push({ keys: HEURISTICS["basics.email"], value: data.basics.email });
  if (data.basics.phone) mappings.push({ keys: HEURISTICS["basics.phone"], value: data.basics.phone });
  if (data.basics.headline) mappings.push({ keys: HEURISTICS["basics.headline"], value: data.basics.headline });
  if (data.basics.location) mappings.push({ keys: HEURISTICS["basics.location"], value: data.basics.location });
  if (data.basics.url.href) {
    mappings.push({ keys: HEURISTICS["basics.url.href"], value: data.basics.url.href });
  }

  // Profiles
  data.sections.profiles.items.forEach((profile) => {
    const key = `basics.${profile.network.toLowerCase()}`;
    const keywords = HEURISTICS[key] || [profile.network.toLowerCase()];
    if (profile.url.href) {
      mappings.push({ keys: keywords, value: profile.url.href });
    }
  });

  return mappings.filter((m) => m.value);
};

// Scoring function to match a DOM element to a mapping
const scoreElement = (element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, keys: string[]): number => {
  let score = 0;
  const attributes = [
    element.name,
    element.id,
    element.getAttribute("autocomplete") || "",
    element.getAttribute("aria-label") || "",
    element.getAttribute("placeholder") || "",
  ].map((s) => s.toLowerCase().replace(/[^a-z0-9]/g, ""));

  // Check surrounding label
  let labelText = "";
  if (element.labels && element.labels.length > 0) {
    labelText = Array.from(element.labels).map(label => label.innerText).join(' ').toLowerCase();
  } else {
    // Try to find a label by proximity (simple heuristic)
    const parent = element.parentElement;
    if (parent) labelText = parent.innerText.split('\n')[0].trim().toLowerCase();
  }
  attributes.push(labelText.replace(/[^a-z0-9]/g, ""));

  for (const key of keys) {
    const normalizedKey = key.replace(/[^a-z0-9]/g, "");

    // Exact match on name/id/autocomplete is strong
    if (attributes.slice(0, 3).some(attr => attr === normalizedKey)) score += 10;

    // Partial match
    if (attributes.some(attr => attr.includes(normalizedKey))) score += 5;
  }

  return score;
};

// New Function: Extracts all visible, fillable form fields from the page
export const extractFormFields = (): FormField[] => {
  const inputs = Array.from(document.querySelectorAll("input, textarea, select")) as (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)[];
  const fields: FormField[] = [];
  let fieldCounter = 0;

  for (const input of inputs) {
    // Skip hidden or disabled fields
    if (input.type === "hidden" || input.style.display === "none" || input.disabled) continue;

    const id = `rx-autofill-${fieldCounter++}`;
    input.setAttribute("data-rx-autofill-id", id); // Tag the element with our unique ID

    let labelText = "";
    if (input.labels && input.labels.length > 0) {
      labelText = Array.from(input.labels).map(label => label.innerText).join(' ').trim();
    } else {
      // Fallback proximity search
      const parent = input.parentElement;
      if (parent) labelText = parent.innerText.split('\n')[0].trim();
    }

    const field: FormField = {
      id,
      label: labelText,
      tagName: input.tagName.toLowerCase() as FormField['tagName'],
      type: input.type,
    };

    if (input.tagName.toLowerCase() === "select") {
      field.options = Array.from((input as HTMLSelectElement).options).map(opt => ({
        label: opt.label,
        value: opt.value,
      }));
    }

    fields.push(field);
  }

  return fields;
};

// New Function: Applies a given map of field IDs and values to the DOM
export const applyAutofill = (map: { id: string; value: string }[]): number => {
  let filledCount = 0;

  for (const item of map) {
    const element = document.querySelector(`[data-rx-autofill-id="${item.id}"]`) as HTMLInputElement | HTMLTextAreaElement | null;

    if (!element) continue;

    // Dispatch events to simulate user typing (for React/Angular support)
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
    if (nativeInputValueSetter && element instanceof HTMLInputElement) {
      nativeInputValueSetter.call(element, item.value);
    } else {
      element.value = item.value;
    }

    const events = [
      new Event('input', { bubbles: true }),
      new Event('change', { bubbles: true }),
      new Event('blur', { bubbles: true }),
    ];
    events.forEach(event => element.dispatchEvent(event));

    // Visual feedback
    element.style.backgroundColor = "#e6fffa"; // Light green
    element.style.transition = "background-color 0.5s";

    filledCount++;
  }

  return filledCount;
};


// New Function: Runs only the local heuristics and returns a map
export const runHeuristics = (data: InformationData): { id: string; value: string }[] => {
  const mappings = flattenInformation(data);
  const inputs = Array.from(document.querySelectorAll("input[data-rx-autofill-id], textarea[data-rx-autofill-id], select[data-rx-autofill-id]")) as (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)[];
  const suggestions: { id: string; value: string }[] = [];
  const filledElements = new Set<HTMLElement>();

  for (const mapping of mappings) {
    let bestMatch: (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) | null = null;
    let maxScore = 0;

    for (const input of inputs) {
      if (filledElements.has(input)) continue;

      const score = scoreElement(input, mapping.keys);

      if (score > maxScore && score > 5) { // Confidence threshold
        maxScore = score;
        bestMatch = input;
      }
    }

    if (bestMatch) {
      const id = bestMatch.getAttribute("data-rx-autofill-id");
      if (id) {
        suggestions.push({ id, value: mapping.value });
        filledElements.add(bestMatch);
      }
    }
  }

  return suggestions;
};
