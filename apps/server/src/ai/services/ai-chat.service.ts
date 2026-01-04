import { Injectable, Logger } from "@nestjs/common";
import type { OpenAIConfigDto } from "@reactive-resume/dto";
import type { InformationData } from "@reactive-resume/schema";

import { buildChatSystemPrompt } from "../prompts";
import { AIProviderFactory } from "../providers";

@Injectable()
export class AIChatService {
  private readonly logger = new Logger(AIChatService.name);

  constructor(private readonly providerFactory: AIProviderFactory) {}

  async chat(
    information: InformationData,
    query: string,
    config: OpenAIConfigDto,
    jobDescription?: string,
    attachmentUrl?: string,
  ): Promise<{ message: string }> {
    const provider = this.providerFactory.getProvider(config);
    const systemPrompt = buildChatSystemPrompt(information, jobDescription);

    const response = await provider.chat(
      {
        systemPrompt,
        userMessage: query,
        attachmentUrl,
      },
      config,
    );

    return { message: response.content };
  }
}
