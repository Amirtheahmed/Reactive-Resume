import { createId } from "@paralleldrive/cuid2";
import slugify from "@sindresorhus/slugify";
import { createZodDto } from "nestjs-zod/dto";
import { z } from "zod";

import { openAIConfigSchema } from "../openai";

export const generateResumeSchema = z.object({
  title: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .transform((value) => {
      const slug = slugify(value);
      if (!slug) return createId();
      return slug;
    })
    .optional(),
  jobDescription: z.string().min(1),
  openAiConfig: openAIConfigSchema.optional(),
});

export class GenerateResumeDto extends createZodDto(generateResumeSchema) {}
