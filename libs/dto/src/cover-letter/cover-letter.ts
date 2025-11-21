// libs/dto/src/cover-letter/cover-letter.ts
import { idSchema } from "@reactive-resume/schema";
import { dateSchema } from "@reactive-resume/utils";
import { createZodDto } from "nestjs-zod/dto";
import { z } from "zod";

import { userSchema } from "../user";

export const coverLetterSchema = z.object({
  id: idSchema,
  title: z.string(),
  slug: z.string(),
  content: z.string(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
  userId: idSchema,
  user: userSchema.optional(),
});

export class CoverLetterDto extends createZodDto(coverLetterSchema) {}
