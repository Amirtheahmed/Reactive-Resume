import { createZodDto } from "nestjs-zod/dto";
import { z } from "zod";

export const openAIConfigSchema = z.object({
  apiKey: z.string().optional(),
  baseURL: z.string().optional(),
  model: z.string().optional(),
  maxTokens: z.number().optional(),
  // Deprecated: isAzure is kept for backward compatibility but 'provider' should be used
  isAzure: z.boolean().default(false),
  azureApiVersion: z.string().optional(),
  provider: z.enum(["openai", "azure", "ollama", "gemini", "vertexai"]).default("openai"),
});

export class OpenAIConfigDto extends createZodDto(openAIConfigSchema) {}
