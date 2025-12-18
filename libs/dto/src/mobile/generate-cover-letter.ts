// libs/dto/src/mobile/generate-cover-letter.ts
import { createZodDto } from "nestjs-zod/dto";
import { z } from "zod";

export const mobileGenerateCoverLetterSchema = z.object({
  jobTitle: z.string().min(1),
  companyName: z.string().optional(),
  jobDescription: z.string().min(1),
  tone: z.enum(["professional", "friendly", "formal"]).default("professional"),
});

export class MobileGenerateCoverLetterDto extends createZodDto(mobileGenerateCoverLetterSchema) {}

export const mobileGenerateCoverLetterResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  pdfUrl: z.string().url().optional(),
});

export type MobileGenerateCoverLetterResponse = z.infer<typeof mobileGenerateCoverLetterResponseSchema>;

