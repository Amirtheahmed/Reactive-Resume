import { createZodDto } from "nestjs-zod/dto";
import { z } from "zod";

export const openAIConfigSchema = z.object({
  apiKey: z.string().optional(),
  baseURL: z.string().optional(),
  model: z.string().optional(),
  maxTokens: z.number().optional(),
  isAzure: z.boolean().default(false),
  azureApiVersion: z.string().optional(),
});

export class OpenAIConfigDto extends createZodDto(openAIConfigSchema) {}
