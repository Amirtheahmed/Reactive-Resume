// libs/dto/src/mobile/autofill-export.ts
import { createZodDto } from "nestjs-zod/dto";
import { z } from "zod";

export const autofillExportSchema = z.object({
  format: z.enum(["flat", "structured"]).default("structured"),
  includeFields: z.array(z.string()).optional(),
});

export class AutofillExportDto extends createZodDto(autofillExportSchema) {}

// Structured autofill response format
export const autofillLocationSchema = z.object({
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
});

export const autofillBasicsSchema = z.object({
  fullName: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: autofillLocationSchema.optional(),
  url: z.string().optional(),
  linkedIn: z.string().optional(),
  github: z.string().optional(),
  twitter: z.string().optional(),
});

export const autofillEducationItemSchema = z.object({
  institution: z.string().optional(),
  degree: z.string().optional(),
  field: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  gpa: z.string().optional(),
  location: z.string().optional(),
});

export const autofillExperienceItemSchema = z.object({
  company: z.string().optional(),
  position: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  location: z.string().optional(),
  summary: z.string().optional(),
  current: z.boolean().optional(),
});

export const autofillSkillSchema = z.object({
  name: z.string(),
  level: z.number().optional(),
  keywords: z.array(z.string()).optional(),
});

export const autofillCertificationSchema = z.object({
  name: z.string().optional(),
  issuer: z.string().optional(),
  date: z.string().optional(),
  url: z.string().optional(),
});

export const autofillLanguageSchema = z.object({
  language: z.string(),
  fluency: z.string().optional(),
});

export const autofillStructuredResponseSchema = z.object({
  basics: autofillBasicsSchema.optional(),
  education: z.array(autofillEducationItemSchema).optional(),
  experience: z.array(autofillExperienceItemSchema).optional(),
  skills: z.array(autofillSkillSchema).optional(),
  certifications: z.array(autofillCertificationSchema).optional(),
  languages: z.array(autofillLanguageSchema).optional(),
});

export type AutofillStructuredResponse = z.infer<typeof autofillStructuredResponseSchema>;

// Flat format is a simple key-value map
export const autofillFlatResponseSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]));

export type AutofillFlatResponse = z.infer<typeof autofillFlatResponseSchema>;

