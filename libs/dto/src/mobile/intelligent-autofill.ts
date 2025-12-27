import { createZodDto } from "nestjs-zod/dto";
import { z } from "zod";

export const jobContextSchema = z.object({
  title: z.string().optional(),
  company: z.string().optional(),
  description: z.string().optional(),
});

export const intelligentAutofillRequestSchema = z.object({
  form_html: z.string(),
  form_text: z.string().optional(),
  page_url: z.string().url(),
  job_context: jobContextSchema.optional(),
});

export class IntelligentAutofillRequestDto extends createZodDto(
  intelligentAutofillRequestSchema,
) {}

export const fieldActionSchema = z.enum(["fill", "select", "check", "upload"]);
export const fieldTypeSchema = z.enum([
  "text",
  "email",
  "tel",
  "url",
  "number",
  "textarea",
  "select",
  "checkbox",
  "radio",
  "file",
  "date",
  "datetime-local",
  "time",
  "month",
  "week",
  "hidden",
  "password",
  "color",
  "range",
  "search",
]);
export const strategySchema = z.enum([
  "DETERMINISTIC",
  "AI_MAPPED",
  "AI_GENERATED",
  "SMART_DEFAULT",
]);
export const fileTypeSchema = z.enum(["resume", "cover_letter", "portfolio"]);

export const fieldInstructionSchema = z.object({
  selector: z.string(),
  type: fieldTypeSchema,
  action: fieldActionSchema,
  value: z.string().nullable(),
  file_type: fileTypeSchema.optional(),
  confidence: z.number().min(0).max(1),
  strategy: strategySchema,
  reasoning: z.string().optional(),
});

export const needsReviewFieldSchema = z.object({
  selector: z.string(),
  type: z.string(),
  label: z.string(),
  reason: z.string(),
  confidence: z.number().min(0).max(1),
  suggestions: z.array(z.string()).optional(),
});

export const autofillMetadataSchema = z.object({
  fields_extracted: z.number(),
  fields_filled: z.number(),
  fields_skipped: z.number(),
  ai_model_used: z.string(),
  processing_time_ms: z.number(),
});

export const intelligentAutofillResponseSchema = z.object({
  fields: z.array(fieldInstructionSchema),
  needs_review: z.array(needsReviewFieldSchema),
  warnings: z.array(z.string()),
  metadata: autofillMetadataSchema,
});

export class IntelligentAutofillResponseDto extends createZodDto(
  intelligentAutofillResponseSchema,
) {}

export type JobContext = z.infer<typeof jobContextSchema>;
export type FieldInstruction = z.infer<typeof fieldInstructionSchema>;
export type NeedsReviewField = z.infer<typeof needsReviewFieldSchema>;
export type AutofillMetadata = z.infer<typeof autofillMetadataSchema>;
export type IntelligentAutofillResponse = z.infer<
  typeof intelligentAutofillResponseSchema
>;
