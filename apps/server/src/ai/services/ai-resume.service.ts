import { Injectable, Logger } from "@nestjs/common";
import { createId } from "@paralleldrive/cuid2";
import type { OpenAIConfigDto } from "@reactive-resume/dto";
import {
  defaultResumeData,
  type InformationData,
  type ResumeData,
  resumeDataSchema,
} from "@reactive-resume/schema";
import deepmerge from "deepmerge";

import { RESUME_SYSTEM_PROMPT } from "../prompts";
import { AIProviderFactory } from "../providers";
import { AICacheService, aiResumeSchema, hydrateAIResumeToFull, zodToGeminiSchema } from "../utils";

@Injectable()
export class AIResumeService {
  private readonly logger = new Logger(AIResumeService.name);

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
  ): Promise<ResumeData> {
    const cacheKey = this.cacheService.generateKey("resume", userId ?? "anonymous", {
      information,
      jobDescription,
      model: config.model,
      provider: config.provider,
    });

    if (!bypassCache) {
      const cached = this.cacheService.get<ResumeData>(cacheKey);
      if (cached) {
        this.logger.log("Returning cached resume");
        return cached;
      }
    }

    const provider = this.providerFactory.getProvider(config);
    const isGemini = this.providerFactory.isGeminiProvider(config.provider);

    const userPrompt = this.buildUserPrompt(information, jobDescription, isGemini);
    const responseSchema = isGemini ? zodToGeminiSchema(aiResumeSchema) : undefined;

    const response = await provider.generateJson<unknown>(
      {
        systemPrompt: RESUME_SYSTEM_PROMPT,
        userPrompt,
        maxTokens: isGemini ? 65_535 : 8192,
        temperature: 0,
        responseSchema,
      },
      config,
    );

    const result = isGemini
      ? this.processGeminiResponse(response.data)
      : this.processOpenAIResponse(response.data);

    this.cacheService.set(cacheKey, result);
    return result;
  }

  private buildUserPrompt(
    information: InformationData,
    jobDescription: string,
    isGemini: boolean,
  ): string {
    if (isGemini) {
      return `<information_bank>
${JSON.stringify(information)}
</information_bank>

<job_description>
${jobDescription}
</job_description>

Generate a tailored resume JSON based on the principles provided. The output structure is enforced by the schema.`;
    }

    return `<json_schema>
${JSON.stringify(resumeDataSchema)}
</json_schema>

<information_bank>
${JSON.stringify(information)}
</information_bank>

<job_description>
${jobDescription}
</job_description>

Now, generate the tailored resume JSON based on the principles and steps provided.`;
  }

  private processGeminiResponse(data: unknown): ResumeData {
    const hydratedData = hydrateAIResumeToFull(data);
    return resumeDataSchema.parse(hydratedData);
  }

  private processOpenAIResponse(data: unknown): ResumeData {
    const sanitizedData = this.sanitizeResumeIds(data);
    return resumeDataSchema.parse(sanitizedData);
  }

  private sanitizeResumeIds(data: unknown): ResumeData {
    const mergedData = deepmerge(defaultResumeData, data as Partial<ResumeData>, {
      arrayMerge: (_target, source) => source,
    });

    this.ensureUrlHref(mergedData.basics?.url);

    if (Array.isArray(mergedData.basics?.customFields)) {
      for (const field of mergedData.basics.customFields) {
        if (field && typeof field === "object") {
          field.id = createId();
        }
      }
    }

    if (mergedData.sections) {
      for (const key in mergedData.sections) {
        if (key === "custom") continue;

        const section = mergedData.sections[key as keyof typeof mergedData.sections];
        if (
          section &&
          typeof section === "object" &&
          "items" in section &&
          Array.isArray(section.items)
        ) {
          for (const item of section.items) {
            if (item && typeof item === "object") {
              item.id = createId();
              if (typeof item.visible !== "boolean") {
                item.visible = true;
              }
              if ("url" in item && item.url && typeof item.url === "object") {
                this.ensureUrlHref(item.url as Record<string, unknown>);
              }
            }
          }
        }
      }

      if (mergedData.sections.custom && typeof mergedData.sections.custom === "object") {
        for (const customKey in mergedData.sections.custom) {
          const customSection = mergedData.sections.custom[customKey];
          if (customSection && typeof customSection === "object") {
            customSection.id = createId();
            if (Array.isArray(customSection.items)) {
              for (const item of customSection.items) {
                if (item && typeof item === "object") {
                  item.id = createId();
                  if (typeof item.visible !== "boolean") {
                    item.visible = true;
                  }
                  if ("url" in item && item.url && typeof item.url === "object") {
                    this.ensureUrlHref(item.url as Record<string, unknown>);
                  }
                }
              }
            }
          }
        }
      }
    }

    return mergedData as ResumeData;
  }

  private ensureUrlHref(url: unknown): void {
    if (url && typeof url === "object" && !("href" in url)) {
      (url as Record<string, unknown>).href = "";
    }
  }
}
