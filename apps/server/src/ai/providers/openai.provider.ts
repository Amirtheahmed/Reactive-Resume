import { Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import type { OpenAIConfigDto } from "@reactive-resume/dto";
import OpenAI from "openai";

import type {
  AIChatOptions,
  AIGenerationOptions,
  AIJsonResponse,
  AIProvider,
  AITextResponse,
} from "./ai-provider.interface";

const DEFAULT_MODEL = "gpt-4o";

@Injectable()
export class OpenAIProvider implements AIProvider {
  private readonly logger = new Logger(OpenAIProvider.name);
  readonly name = "openai";

  private createClient(config: OpenAIConfigDto): OpenAI {
    const { apiKey, baseURL, isAzure, azureApiVersion, model, provider } = config;

    if (!apiKey) {
      throw new InternalServerErrorException("AI API Key is missing. Please check your settings.");
    }

    if (isAzure || provider === "azure") {
      if (!baseURL || !model || !azureApiVersion) {
        throw new InternalServerErrorException(
          "Azure OpenAI configuration is missing (Base URL, Model, or API Version).",
        );
      }

      const azureBaseURL = baseURL.replace(/\/$/, "");

      return new OpenAI({
        apiKey,
        baseURL: `${azureBaseURL}/openai/deployments/${model}`,
        defaultQuery: { "api-version": azureApiVersion },
      });
    }

    return new OpenAI({
      apiKey,
      baseURL: baseURL ?? undefined,
    });
  }

  async generateJson<T>(
    options: AIGenerationOptions,
    config: OpenAIConfigDto,
  ): Promise<AIJsonResponse<T>> {
    const client = this.createClient(config);
    const model = config.model ?? DEFAULT_MODEL;
    const { systemPrompt, userPrompt, maxTokens = 8192 } = options;

    try {
      const response = await client.chat.completions.create({
        model,
        max_completion_tokens: maxTokens,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              systemPrompt +
              "\n\n# Output Format\n- The final output must be a single, raw JSON object. **DO NOT** wrap it in markdown code blocks (no ```json).",
          },
          { role: "user", content: userPrompt },
        ],
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new InternalServerErrorException("AI returned an empty response.");
      }

      const sanitizedContent = content.replace(/^```json\s*/, "").replace(/\s*```$/, "");

      try {
        const parsed = JSON.parse(sanitizedContent) as T;
        return { data: parsed, raw: content };
      } catch (error) {
        this.logger.error(`JSON Parsing Error: ${(error as Error).message}`);
        this.logger.debug(`Raw Content: ${content}`);
        throw new InternalServerErrorException(
          "AI returned invalid JSON.",
          (error as Error).message,
        );
      }
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      this.logger.error(error);
      throw new InternalServerErrorException(
        "Failed to generate response via OpenAI",
        (error as Error).message,
      );
    }
  }

  async chat(options: AIChatOptions, config: OpenAIConfigDto): Promise<AITextResponse> {
    const client = this.createClient(config);
    const model = config.model ?? DEFAULT_MODEL;
    const { systemPrompt, userMessage, attachmentUrl } = options;

    try {
      const userContent = this.buildUserContent(userMessage, attachmentUrl);

      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new InternalServerErrorException("AI returned an empty response.");
      }

      return { content };
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException("Failed to chat via AI", (error as Error).message);
    }
  }

  private buildUserContent(
    message: string,
    attachmentUrl?: string,
  ):
    | string
    | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> {
    if (!attachmentUrl) {
      return message;
    }

    if (this.isImageUrl(attachmentUrl)) {
      return [
        { type: "text" as const, text: message },
        { type: "image_url" as const, image_url: { url: attachmentUrl } },
      ];
    }

    return `${message}\n\n[Attachment: ${attachmentUrl}]`;
  }

  private isImageUrl(url: string): boolean {
    const extension = url.split(".").pop()?.toLowerCase();
    return ["jpg", "jpeg", "png", "webp", "gif"].includes(extension ?? "");
  }
}
