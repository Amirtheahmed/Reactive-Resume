import { createZodDto } from "nestjs-zod/dto";
import { z } from "zod";

export const chatRequestSchema = z.object({
  message: z.string(),
  jobDescription: z.string().optional(),
});

export class ChatRequestDto extends createZodDto(chatRequestSchema) {}

export const chatResponseSchema = z.object({
  message: z.string(),
});

export class ChatResponseDto extends createZodDto(chatResponseSchema) {}
