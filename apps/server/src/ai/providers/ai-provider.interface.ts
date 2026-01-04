import type { OpenAIConfigDto } from "@reactive-resume/dto";

/**
 * Common response types for AI provider operations
 */
export interface AITextResponse {
  content: string;
}

export interface AIJsonResponse<T = unknown> {
  data: T;
  raw?: string;
}

export interface AIChatMessage {
  role: "system" | "user" | "assistant";
  content: string | AIMessageContent[];
}

export interface AIMessageContent {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

/**
 * Configuration for AI generation requests
 */
export interface AIGenerationOptions {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  responseSchema?: Record<string, unknown>;
}

/**
 * Configuration for AI chat requests
 */
export interface AIChatOptions {
  systemPrompt: string;
  userMessage: string;
  attachmentUrl?: string;
}

/**
 * Abstract interface that all AI providers must implement.
 * This enables the Strategy pattern for supporting multiple AI backends.
 */
export interface AIProvider {
  /**
   * Provider identifier (e.g., 'openai', 'gemini', 'azure')
   */
  readonly name: string;

  /**
   * Generate a JSON response using structured output
   * @param options Generation options including prompts and schema
   * @param config Provider-specific configuration
   * @returns Parsed JSON response
   */
  generateJson<T>(
    options: AIGenerationOptions,
    config: OpenAIConfigDto,
  ): Promise<AIJsonResponse<T>>;

  /**
   * Generate a text/chat response
   * @param options Chat options including prompts and optional attachment
   * @param config Provider-specific configuration
   * @returns Text response
   */
  chat(options: AIChatOptions, config: OpenAIConfigDto): Promise<AITextResponse>;
}

/**
 * Token for dependency injection of the AI provider factory
 */
export const AI_PROVIDER_FACTORY = "AI_PROVIDER_FACTORY";
