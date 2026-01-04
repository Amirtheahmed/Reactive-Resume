import { Injectable } from "@nestjs/common";
import type { OpenAIConfigDto } from "@reactive-resume/dto";

import type { AIProvider } from "./ai-provider.interface";
import { GeminiProvider } from "./gemini.provider";
import { OpenAIProvider } from "./openai.provider";

type ProviderType = OpenAIConfigDto["provider"];

@Injectable()
export class AIProviderFactory {
  constructor(
    private readonly openaiProvider: OpenAIProvider,
    private readonly geminiProvider: GeminiProvider,
  ) {}

  getProvider(config: OpenAIConfigDto): AIProvider {
    return this.getProviderByType(config.provider);
  }

  getProviderByType(provider: ProviderType): AIProvider {
    switch (provider) {
      case "gemini":
      case "vertexai":
        return this.geminiProvider;
      case "openai":
      case "azure":
      case "ollama":
      default:
        return this.openaiProvider;
    }
  }

  isGeminiProvider(provider: ProviderType): boolean {
    return provider === "gemini" || provider === "vertexai";
  }
}
