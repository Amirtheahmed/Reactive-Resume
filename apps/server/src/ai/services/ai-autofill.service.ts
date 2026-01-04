import { Injectable, Logger } from "@nestjs/common";
import type {
  AutofillMapRequestDto,
  IntelligentAutofillResponse,
  OpenAIConfigDto,
  QuestionAutofillResponse,
  QuestionItem,
  JobContext,
  QuestionJobContext,
} from "@reactive-resume/dto";
import {
  intelligentAutofillResponseSchema,
  questionAutofillResponseSchema,
} from "@reactive-resume/dto";
import type { InformationData } from "@reactive-resume/schema";
import { zodToJsonSchema } from "zod-to-json-schema";

import {
  AUTOFILL_MAP_RESPONSE_SCHEMA,
  AUTOFILL_MAP_SYSTEM_PROMPT,
  INTELLIGENT_AUTOFILL_SYSTEM_PROMPT,
  QUESTION_AUTOFILL_SYSTEM_PROMPT,
} from "../prompts";
import { AIProviderFactory } from "../providers";
import { AICacheService } from "../utils";

type AutofillMapResult = { id: string; value: string; strategy: "AI_MAPPED" | "AI_GENERATED" }[];

interface AutofillMapResponse {
  mapping: AutofillMapResult;
}

@Injectable()
export class AIAutofillService {
  private readonly logger = new Logger(AIAutofillService.name);

  constructor(
    private readonly providerFactory: AIProviderFactory,
    private readonly cacheService: AICacheService,
  ) {}

  async createAutofillMap(
    information: InformationData,
    fields: AutofillMapRequestDto["fields"],
    config: OpenAIConfigDto,
    jobDescription?: string,
    userId?: string,
    bypassCache = false,
  ): Promise<AutofillMapResult> {
    const cacheKey = this.cacheService.generateKey("autofill-map", userId ?? "anonymous", {
      information,
      fields,
      jobDescription,
      model: config.model,
      provider: config.provider,
    });

    if (!bypassCache) {
      const cached = this.cacheService.get<AutofillMapResult>(cacheKey);
      if (cached) {
        this.logger.log("Returning cached autofill map");
        return cached;
      }
    }

    const provider = this.providerFactory.getProvider(config);
    const isGemini = this.providerFactory.isGeminiProvider(config.provider);

    const userPrompt = `<INFORMATION_BANK>
${JSON.stringify(information)}
</INFORMATION_BANK>

<FORM_FIELDS>
${JSON.stringify(fields)}
</FORM_FIELDS>

${jobDescription ? `<JOB_DESCRIPTION>${jobDescription}</JOB_DESCRIPTION>` : ""}

Now, generate the JSON object containing the field mapping.`;

    const systemPrompt = isGemini
      ? AUTOFILL_MAP_SYSTEM_PROMPT
      : AUTOFILL_MAP_SYSTEM_PROMPT +
        `

<IMPORTANT_JSON_RULES>
- **Output strict, valid JSON.**
- **Escape all double quotes inside string values.** Example: "I want to build \\"scalable\\" apps." instead of "I want to build "scalable" apps."
- Do not include unescaped newlines in strings. Use \\n instead.
</IMPORTANT_JSON_RULES>`;

    const response = await provider.generateJson<AutofillMapResponse>(
      {
        systemPrompt,
        userPrompt,
        responseSchema: isGemini ? AUTOFILL_MAP_RESPONSE_SCHEMA : undefined,
      },
      config,
    );

    if (!Array.isArray(response.data.mapping)) {
      throw new TypeError("AI did not return a 'mapping' array in the response.");
    }

    this.cacheService.set(cacheKey, response.data.mapping);
    return response.data.mapping;
  }

  async intelligentAutofill(
    information: InformationData,
    formHtml: string,
    formText: string | undefined,
    pageUrl: string,
    jobContext: JobContext | undefined,
    config: OpenAIConfigDto,
  ): Promise<IntelligentAutofillResponse> {
    const startTime = Date.now();
    const provider = this.providerFactory.getProvider(config);
    const isGemini = this.providerFactory.isGeminiProvider(config.provider);

    const userPrompt = this.buildIntelligentAutofillPrompt(
      information,
      formHtml,
      formText,
      pageUrl,
      jobContext,
    );

    const schema = zodToJsonSchema(intelligentAutofillResponseSchema, {
      $refStrategy: "none",
    });

    const systemPrompt = isGemini
      ? INTELLIGENT_AUTOFILL_SYSTEM_PROMPT
      : INTELLIGENT_AUTOFILL_SYSTEM_PROMPT +
        `

OUTPUT: JSON matching the schema exactly. No markdown wrapping.

<JSON_SCHEMA>
${JSON.stringify(schema)}
</JSON_SCHEMA>`;

    const response = await provider.generateJson<IntelligentAutofillResponse>(
      {
        systemPrompt,
        userPrompt,
        responseSchema: isGemini ? schema : undefined,
      },
      config,
    );

    const validated = this.processIntelligentAutofillResponse(
      response.data,
      config.model ?? "unknown",
      startTime,
    );

    return validated;
  }

  async questionAutofill(
    information: InformationData,
    questions: QuestionItem[],
    jobContext: QuestionJobContext | undefined,
    config: OpenAIConfigDto,
    pageUrl?: string,
    instructions?: string,
  ): Promise<QuestionAutofillResponse> {
    const startTime = Date.now();
    const provider = this.providerFactory.getProvider(config);
    const isGemini = this.providerFactory.isGeminiProvider(config.provider);

    const userPrompt = this.buildQuestionAutofillPrompt(
      information,
      questions,
      jobContext,
      pageUrl,
      instructions,
    );

    const schema = zodToJsonSchema(questionAutofillResponseSchema, {
      $refStrategy: "none",
    });

    const systemPrompt = isGemini
      ? QUESTION_AUTOFILL_SYSTEM_PROMPT
      : QUESTION_AUTOFILL_SYSTEM_PROMPT +
        `

OUTPUT: JSON matching the schema exactly. No markdown wrapping.

<JSON_SCHEMA>
${JSON.stringify(schema)}
</JSON_SCHEMA>`;

    const response = await provider.generateJson<QuestionAutofillResponse>(
      {
        systemPrompt,
        userPrompt,
        responseSchema: isGemini ? schema : undefined,
      },
      config,
    );

    const validated = this.processQuestionAutofillResponse(
      response.data,
      config.model ?? "unknown",
      startTime,
    );

    return validated;
  }

  private buildIntelligentAutofillPrompt(
    information: InformationData,
    formHtml: string,
    formText: string | undefined,
    pageUrl: string,
    jobContext: JobContext | undefined,
  ): string {
    return `<USER_PROFILE>
${JSON.stringify(information, null, 2)}
</USER_PROFILE>

<FORM_HTML>
${formHtml}
</FORM_HTML>

${formText ? `<FORM_VISIBLE_TEXT>\n${formText}\n</FORM_VISIBLE_TEXT>` : ""}

<PAGE_URL>${pageUrl}</PAGE_URL>

${
  jobContext
    ? `<JOB_CONTEXT>
Title: ${jobContext.title ?? "Unknown"}
Company: ${jobContext.company ?? "Unknown"}
Description: ${jobContext.description ?? "Not provided"}
</JOB_CONTEXT>`
    : ""
}

Analyze this form and return fill instructions for each field. Put fields with confidence >= 0.60 in "fields" array and fields with confidence < 0.60 in "needs_review" array.`;
  }

  private buildQuestionAutofillPrompt(
    information: InformationData,
    questions: QuestionItem[],
    jobContext: QuestionJobContext | undefined,
    pageUrl?: string,
    instructions?: string,
  ): string {
    return `<USER_PROFILE>
${JSON.stringify(information, null, 2)}
</USER_PROFILE>

<QUESTIONS>
${JSON.stringify(questions, null, 2)}
</QUESTIONS>

${
  jobContext
    ? `<JOB_CONTEXT>
Title: ${jobContext.title ?? "Unknown"}
Company: ${jobContext.company ?? "Unknown"}
Industry: ${jobContext.industry ?? "Not specified"}
Location: ${jobContext.location ?? "Not specified"}
Employment Type: ${jobContext.employmentType ?? "Not specified"}
Experience Level: ${jobContext.experienceLevel ?? "Not specified"}
Key Requirements: ${jobContext.keyRequirements?.join(", ") ?? "Not specified"}
Description: ${jobContext.description ?? "Not provided"}
</JOB_CONTEXT>`
    : ""
}

${pageUrl ? `<PAGE_URL>${pageUrl}</PAGE_URL>` : ""}

${instructions ? `<ADDITIONAL_INSTRUCTIONS>${instructions}</ADDITIONAL_INSTRUCTIONS>` : ""}

Answer each question based on the user's profile. Put questions with confidence >= 0.60 in "answers" and questions with confidence < 0.60 in "needs_review".`;
  }

  private processIntelligentAutofillResponse(
    data: IntelligentAutofillResponse,
    model: string,
    startTime: number,
  ): IntelligentAutofillResponse {
    if (data.fields && Array.isArray(data.fields)) {
      for (const field of data.fields) {
        if (field.file_type === null) delete field.file_type;
        if (field.reasoning === null) delete field.reasoning;
      }
    }
    if (data.needs_review && Array.isArray(data.needs_review)) {
      for (const field of data.needs_review) {
        if (field.suggestions === null) delete field.suggestions;
      }
    }

    const validated = intelligentAutofillResponseSchema.parse(data);

    validated.metadata = {
      ...validated.metadata,
      ai_model_used: model,
      processing_time_ms: Date.now() - startTime,
    };

    return validated;
  }

  private processQuestionAutofillResponse(
    data: QuestionAutofillResponse,
    model: string,
    startTime: number,
  ): QuestionAutofillResponse {
    if (data.answers && Array.isArray(data.answers)) {
      for (const answer of data.answers) {
        if (answer.reasoning === null) delete answer.reasoning;
        if (answer.source_field === null) delete answer.source_field;
      }
    }
    if (data.needs_review && Array.isArray(data.needs_review)) {
      for (const item of data.needs_review) {
        if (item.suggestions === null) delete item.suggestions;
        if (item.category === null) delete item.category;
      }
    }

    const validated = questionAutofillResponseSchema.parse(data);

    const allConfidences = [
      ...validated.answers.map((a) => a.confidence),
      ...validated.needs_review.map((r) => r.confidence),
    ];
    const avgConfidence =
      allConfidences.length > 0
        ? allConfidences.reduce((sum, c) => sum + c, 0) / allConfidences.length
        : 0;

    validated.metadata = {
      ...validated.metadata,
      ai_model_used: model,
      processing_time_ms: Date.now() - startTime,
      average_confidence: Math.round(avgConfidence * 100) / 100,
    };

    return validated;
  }
}
