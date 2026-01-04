import { GoogleGenAI } from "@google/genai";
import { Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import type { OpenAIConfigDto } from "@reactive-resume/dto";

import type {
  AIChatOptions,
  AIGenerationOptions,
  AIJsonResponse,
  AIProvider,
  AITextResponse,
} from "./ai-provider.interface";

const DEFAULT_MODEL = "gemini-3-flash-preview";

@Injectable()
export class GeminiProvider implements AIProvider {
  private readonly logger = new Logger(GeminiProvider.name);
  readonly name = "gemini";

  private createClient(config: OpenAIConfigDto): GoogleGenAI {
    const { apiKey, provider } = config;

    if (!apiKey) {
      throw new InternalServerErrorException(
        "Gemini API Key is missing. Please check your settings.",
      );
    }

    if (provider === "vertexai") {
      return new GoogleGenAI({
        vertexai: true,
        apiVersion: "v1beta1",
        apiKey,
      });
    }

    return new GoogleGenAI({ apiKey });
  }

  async generateJson<T>(
    options: AIGenerationOptions,
    config: OpenAIConfigDto,
  ): Promise<AIJsonResponse<T>> {
    const client = this.createClient(config);
    const model = config.model ?? DEFAULT_MODEL;
    const {
      systemPrompt,
      userPrompt,
      maxTokens = 65_535,
      temperature = 0,
      responseSchema,
    } = options;

    try {
      const response = await client.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: maxTokens,
          responseMimeType: "application/json",
          responseSchema: responseSchema,
          temperature,
        },
      });

      const content = response.text;
      if (!content) {
        throw new InternalServerErrorException("Gemini returned an empty response.");
      }

      this.logger.debug(`Raw Content: ${content.slice(0, 500)}...`);

      try {
        const parsed = JSON.parse(content) as T;
        return { data: parsed, raw: content };
      } catch (error) {
        this.logger.error(`JSON Parsing Error: ${(error as Error).message}`);
        this.logger.debug(`Raw Content: ${content}`);
        throw new InternalServerErrorException(
          "Gemini returned invalid JSON.",
          (error as Error).message,
        );
      }
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      this.logger.error(error);
      throw new InternalServerErrorException(
        "Failed to generate response via Gemini",
        (error as Error).message,
      );
    }
  }

  async chat(options: AIChatOptions, config: OpenAIConfigDto): Promise<AITextResponse> {
    const client = this.createClient(config);
    const model = config.model ?? DEFAULT_MODEL;
    const { systemPrompt, userMessage, attachmentUrl } = options;

    try {
      let messageText = systemPrompt + "\n\n" + userMessage;

      if (attachmentUrl && !this.isImageUrl(attachmentUrl)) {
        messageText += `\n\n[Attachment: ${attachmentUrl}]`;
      }

      const response = await client.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: messageText }] }],
      });

      const content = response.text;
      if (!content) {
        throw new InternalServerErrorException("Gemini returned an empty response.");
      }

      return { content };
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException("Failed to chat via Gemini", (error as Error).message);
    }
  }

  private isImageUrl(url: string): boolean {
    const extension = url.split(".").pop()?.toLowerCase();
    return ["jpg", "jpeg", "png", "webp", "gif"].includes(extension ?? "");
  }
}
