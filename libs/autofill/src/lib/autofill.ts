import type { InformationData } from "@reactive-resume/schema";

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
  mappings.push({ keys: HEURISTICS["basics.name"], value: data.basics.name });
  mappings.push({ keys: HEURISTICS["basics.email"], value: data.basics.email });
  mappings.push({ keys: HEURISTICS["basics.phone"], value: data.basics.phone });
  mappings.push({ keys: HEURISTICS["basics.headline"], value: data.basics.headline });
  mappings.push({ keys: HEURISTICS["basics.location"], value: data.basics.location });
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

  return mappings;
};

// Scoring function to match a DOM element to a mapping
const scoreElement = (element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, keys: string[]): number => {
  let score = 0;
  const attributes = [
    element.name,
    element.id,
    element.getAttribute("autocomplete") || "",
    element.getAttribute("aria-label") || "",
    element.ariaPlaceholder || "",
  ].map((s) => s.toLowerCase().replace(/[^a-z0-9]/g, ""));

  // Check surrounding label
  let labelText = "";
  if (element.labels && element.labels.length > 0) {
    labelText = element.labels[0].innerText.toLowerCase();
  } else {
    // Try to find a label by proximity (simple heuristic)
    const parent = element.parentElement;
    if (parent) labelText = parent.innerText.toLowerCase();
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

// Main Autofill Function
export const autofillPage = (data: InformationData): number => {
  const mappings = flattenInformation(data);
  const inputs = Array.from(document.querySelectorAll("input, textarea, select")) as (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)[];

  let filledCount = 0;

  // Create a set of filled elements to avoid overwriting best matches
  const filledElements = new Set<HTMLElement>();

  for (const mapping of mappings) {
    if (!mapping.value) continue;

    let bestMatch: HTMLElement | null = null;
    let maxScore = 0;

    for (const input of inputs) {
      if (filledElements.has(input)) continue;

      // Skip hidden inputs
      if (input.type === "hidden" || input.style.display === "none") continue;

      const score = scoreElement(input, mapping.keys);

      if (score > maxScore && score > 3) { // Threshold
        maxScore = score;
        bestMatch = input;
      }
    }

    if (bestMatch) {
      const element = bestMatch as HTMLInputElement | HTMLTextAreaElement; // Type casting for simplicity

      // Dispatch events to simulate user typing (React/Angular support)
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;

      if (nativeInputValueSetter && element instanceof HTMLInputElement) {
        nativeInputValueSetter.call(element, mapping.value);
      } else {
        element.value = mapping.value;
      }

      const inputEvent = new Event('input', { bubbles: true });
      const changeEvent = new Event('change', { bubbles: true });
      const blurEvent = new Event('blur', { bubbles: true });

      element.dispatchEvent(inputEvent);
      element.dispatchEvent(changeEvent);
      element.dispatchEvent(blurEvent);

      // Visual feedback
      element.style.backgroundColor = "#e6fffa"; // Light green
      element.style.transition = "background-color 0.5s";

      filledElements.add(element);
      filledCount++;
    }
  }

  return filledCount;
};
