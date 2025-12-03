import { createZodDto } from "nestjs-zod/dto";
import { z } from "zod";

export const chatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
  createdAt: z.date().or(z.string()),
});

export class ChatMessageDto extends createZodDto(chatMessageSchema) {}

export const chatSchema = z.object({
  id: z.string(),
  title: z.string(),
  messages: z.array(chatMessageSchema),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export class ChatDto extends createZodDto(chatSchema) {}

export const chatRequestSchema = z.object({
  chatId: z.string().optional(),
  message: z.string(),
  jobDescription: z.string().optional(),
  attachmentUrl: z.string().url().optional(),
});

export class ChatRequestDto extends createZodDto(chatRequestSchema) {}

export const chatResponseSchema = z.object({
  chatId: z.string(),
  message: z.string(),
});

export class ChatResponseDto extends createZodDto(chatResponseSchema) {}
