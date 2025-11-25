// libs/dto/src/extension/generate.ts
import { createZodDto } from "nestjs-zod/dto";
import { z } from "zod";

export const extensionGenerateResumeSchema = z.object({
  jobTitle: z.string().min(1),
  companyName: z.string().optional(),
  jobDescription: z.string().min(1),
  template: z.string().default("rhyhorn"),
});

export class ExtensionGenerateResumeDto extends createZodDto(extensionGenerateResumeSchema) {}

export const extensionGenerateCoverLetterSchema = z.object({
  jobTitle: z.string().min(1),
  companyName: z.string().optional(),
  jobDescription: z.string().min(1),
});

export class ExtensionGenerateCoverLetterDto extends createZodDto(extensionGenerateCoverLetterSchema) {}
