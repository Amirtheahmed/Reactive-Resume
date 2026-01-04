import { Injectable, Logger } from "@nestjs/common";
import type { OpenAIConfigDto } from "@reactive-resume/dto";
import type { InformationData } from "@reactive-resume/schema";

import { COVER_LETTER_RESPONSE_SCHEMA, COVER_LETTER_SYSTEM_PROMPT } from "../prompts";
import { AIProviderFactory } from "../providers";
import { AICacheService } from "../utils";

interface CoverLetterResponse {
  content: string;
}

@Injectable()
export class AICoverLetterService {
  private readonly logger = new Logger(AICoverLetterService.name);

  constructor(
    private readonly providerFactory: AIProviderFactory,
    private readonly cacheService: AICacheService,
  ) {}

  async generate(
    information: InformationData,
    jobDescription: string,
    config: OpenAIConfigDto,
    userId?: string,
    bypassCache = false,
  ): Promise<CoverLetterResponse> {
    const cacheKey = this.cacheService.generateKey("cover-letter", userId ?? "anonymous", {
      information,
      jobDescription,
      model: config.model,
      provider: config.provider,
    });

    if (!bypassCache) {
      const cached = this.cacheService.get<CoverLetterResponse>(cacheKey);
      if (cached) {
        this.logger.log("Returning cached cover letter");
        return cached;
      }
    }

    const provider = this.providerFactory.getProvider(config);
    const isGemini = this.providerFactory.isGeminiProvider(config.provider);

    const userPrompt = `<information_bank>
${JSON.stringify(information)}
</information_bank>

<job_description>
${jobDescription}
</job_description>

Now, generate the cover letter JSON.`;

    const response = await provider.generateJson<CoverLetterResponse>(
      {
        systemPrompt: COVER_LETTER_SYSTEM_PROMPT,
        userPrompt,
        responseSchema: isGemini ? COVER_LETTER_RESPONSE_SCHEMA : undefined,
      },
      config,
    );

    const result = this.processResponse(response.data);
    this.cacheService.set(cacheKey, result);
    return result;
  }

  private processResponse(data: CoverLetterResponse): CoverLetterResponse {
    if (typeof data.content !== "string") {
      throw new TypeError("AI did not return content in the expected format.");
    }

    return {
      content: data.content.replace(/(<p><br><\/p>\s*){2,}/g, "<p><br></p>"),
    };
  }
}
