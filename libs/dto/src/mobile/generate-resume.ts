// libs/dto/src/mobile/generate-resume.ts
import { createZodDto } from "nestjs-zod/dto";
import { z } from "zod";

export const mobileGenerateResumeSchema = z.object({
  jobTitle: z.string().min(1),
  companyName: z.string().optional(),
  jobDescription: z.string().min(1),
  template: z.string().default("rhyhorn"),
  outputFormat: z.enum(["pdf", "json", "both"]).default("pdf"),
});

export class MobileGenerateResumeDto extends createZodDto(mobileGenerateResumeSchema) {}

export const mobileGenerateResumeResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  pdfUrl: z.string().url().optional(),
  previewUrl: z.string().url().optional(),
  data: z.any().optional(), // Resume JSON data if outputFormat includes 'json'
});

export type MobileGenerateResumeResponse = z.infer<typeof mobileGenerateResumeResponseSchema>;

