import { createZodDto } from "nestjs-zod/dto";
import { z } from "zod";

export const extensionGenerateResumeSchema = z.object({
  jobTitle: z.string().min(1),
  companyName: z.string().optional(),
  jobDescription: z.string().min(1),
  template: z.string().default("rhyhorn"),
  // Optional: We can add overrides for specific resume fields later
});

export class ExtensionGenerateResumeDto extends createZodDto(extensionGenerateResumeSchema) {}
