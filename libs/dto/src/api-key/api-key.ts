import { idSchema } from "@reactive-resume/schema";
import { dateSchema } from "@reactive-resume/utils";
import { createZodDto } from "nestjs-zod/dto";
import { z } from "zod";

export const apiKeySchema = z.object({
  id: idSchema,
  name: z.string(),
  lastUsed: dateSchema.nullable(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
});

export class ApiKeyDto extends createZodDto(apiKeySchema) {}

// Response when creating a key (includes the full secret key once)
export const apiKeyWithSecretSchema = apiKeySchema.extend({
  secretKey: z.string(),
});

export class ApiKeyWithSecretDto extends createZodDto(apiKeyWithSecretSchema) {}
