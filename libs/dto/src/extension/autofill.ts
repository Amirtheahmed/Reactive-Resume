// libs/dto/src/extension/autofill.ts
import { createZodDto } from "nestjs-zod/dto";
import { z } from "zod";

export const formFieldSchema = z.object({
  id: z.string(), // A unique identifier for the field on the page
  label: z.string().optional(),
  tagName: z.enum(["input", "textarea", "select"]),
  type: z.string().optional(),
  options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
});

export const autofillMapRequestSchema = z.object({
  url: z.string().url(),
  fields: z.array(formFieldSchema),
  jobDescription: z.string().optional(), // [!code ++]
});

export type FormField = z.infer<typeof formFieldSchema>;

export class AutofillMapRequestDto extends createZodDto(autofillMapRequestSchema) {}

export const autofillMapResponseSchema = z.array(
  z.object({
    id: z.string(),
    value: z.string(),
    strategy: z.enum(["AI_MAPPED", "AI_GENERATED"]),
  }),
);

export class AutofillMapResponseDto extends createZodDto(autofillMapResponseSchema) {}
