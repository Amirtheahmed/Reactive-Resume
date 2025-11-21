// libs/dto/src/cover-letter/update.ts
import { createZodDto } from "nestjs-zod/dto";

import { createCoverLetterSchema } from "./create";

export const updateCoverLetterSchema = createCoverLetterSchema.partial();

export class UpdateCoverLetterDto extends createZodDto(updateCoverLetterSchema) {}
