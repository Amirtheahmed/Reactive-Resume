// libs/dto/src/resume/generate.ts
import { createId } from "@paralleldrive/cuid2";
import slugify from "@sindresorhus/slugify";
import { createZodDto } from "nestjs-zod/dto";
import { z } from "zod";

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
});

export class GenerateResumeDto extends createZodDto(generateResumeSchema) {}
