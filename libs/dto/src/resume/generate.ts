// libs/dto/src/resume/generate.ts
import { createZodDto } from "nestjs-zod/dto";
import { z } from "zod";
import slugify from "@sindresorhus/slugify";
import { createId } from "@paralleldrive/cuid2";

export const generateResumeSchema = z.object({
  title: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .transform((value) => {
      const slug = slugify(value);
      if (!slug) return createId();
      return slug;
    }),
  jobDescription: z.string().min(1),
});

export class GenerateResumeDto extends createZodDto(generateResumeSchema) {}
