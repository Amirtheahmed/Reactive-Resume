import { createZodDto } from "nestjs-zod/dto";
import { z } from "zod";

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(50),
});

export class CreateApiKeyDto extends createZodDto(createApiKeySchema) {}
