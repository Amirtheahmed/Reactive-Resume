import type { ZodType } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

/**
 * Fields not supported by Google Gemini's structured output API.
 * @see https://ai.google.dev/gemini-api/docs/structured-output
 */
const GEMINI_UNSUPPORTED_FIELDS = [
  "$schema",
  "definitions",
  "$ref",
  "additionalProperties",
  "default",
  "anyOf",
  "oneOf",
  "allOf",
  "not",
  "const",
  "maxLength",
  "minLength",
  "maximum",
  "minimum",
  "pattern",
  "format",
] as const;

function isInvalidSchema(schema: unknown): boolean {
  if (typeof schema !== "object" || schema === null) return true;
  const s = schema as Record<string, unknown>;

  if (Object.keys(s).length === 0) return true;

  if (s.type === "object" && (!s.properties || Object.keys(s.properties as object).length === 0)) {
    return true;
  }

  return false;
}

function removeInvalidProperties(props: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (!isInvalidSchema(value)) {
      result[key] = value;
    }
  }
  return result;
}

function cleanSchemaForGemini(schema: unknown): unknown {
  if (schema === null || schema === undefined) {
    return schema;
  }

  if (typeof schema !== "object") {
    return schema;
  }

  if (Array.isArray(schema)) {
    return schema.map((item) => cleanSchemaForGemini(item));
  }

  const schemaObj = schema as Record<string, unknown>;
  const cleaned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(schemaObj)) {
    if ((GEMINI_UNSUPPORTED_FIELDS as readonly string[]).includes(key)) {
      continue;
    }
    cleaned[key] = cleanSchemaForGemini(value);
  }

  if (cleaned.type === "object" && cleaned.properties) {
    const props = cleaned.properties as Record<string, unknown>;
    const cleanedProps = removeInvalidProperties(props);
    cleaned.properties = cleanedProps;

    if (Array.isArray(cleaned.required)) {
      const validKeys = new Set(Object.keys(cleanedProps));
      cleaned.required = (cleaned.required as string[]).filter((key) => validKeys.has(key));
    }
  }

  return cleaned;
}

/**
 * Converts a Zod schema to a Google Gemini-compatible JSON Schema.
 * Uses `$refStrategy: 'none'` to avoid nesting depth errors, then removes unsupported fields.
 * @see https://ai.google.dev/gemini-api/docs/structured-output
 */
export function zodToGeminiSchema(zodSchema: ZodType): Record<string, unknown> {
  const jsonSchema = zodToJsonSchema(zodSchema, {
    $refStrategy: "none",
  });

  return cleanSchemaForGemini(jsonSchema) as Record<string, unknown>;
  return jsonSchema as Record<string, unknown>;
}
