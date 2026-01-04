import { Injectable } from "@nestjs/common";
import type {
  AutofillMapRequestDto,
  IntelligentAutofillResponse,
  JobContext,
  OpenAIConfigDto,
  QuestionAutofillResponse,
  QuestionItem,
  QuestionJobContext,
} from "@reactive-resume/dto";
import type { InformationData, ResumeData } from "@reactive-resume/schema";

import { AIAutofillService } from "./ai-autofill.service";
import { AIChatService } from "./ai-chat.service";
import { AICoverLetterService } from "./ai-cover-letter.service";
import { AIResumeService } from "./ai-resume.service";

@Injectable()
export class AIService {
  constructor(
    private readonly resumeService: AIResumeService,
    private readonly coverLetterService: AICoverLetterService,
    private readonly chatService: AIChatService,
    private readonly autofillService: AIAutofillService,
  ) {}

  async generateResume(
    information: InformationData,
    jobDescription: string,
    config: OpenAIConfigDto,
    userId?: string,
    bypassCache = false,
  ): Promise<ResumeData> {
    return this.resumeService.generate(information, jobDescription, config, userId, bypassCache);
  }

  async generateCoverLetter(
    information: InformationData,
    jobDescription: string,
    config: OpenAIConfigDto,
    userId?: string,
    bypassCache = false,
  ): Promise<{ content: string }> {
    return this.coverLetterService.generate(
      information,
      jobDescription,
      config,
      userId,
      bypassCache,
    );
  }

  async chat(
    information: InformationData,
    query: string,
    config: OpenAIConfigDto,
    jobDescription?: string,
    attachmentUrl?: string,
  ): Promise<{ message: string }> {
    return this.chatService.chat(information, query, config, jobDescription, attachmentUrl);
  }

  async createAutofillMap(
    information: InformationData,
    fields: AutofillMapRequestDto["fields"],
    config: OpenAIConfigDto,
    jobDescription?: string,
    userId?: string,
    bypassCache = false,
  ): Promise<{ id: string; value: string; strategy: "AI_MAPPED" | "AI_GENERATED" }[]> {
    return this.autofillService.createAutofillMap(
      information,
      fields,
      config,
      jobDescription,
      userId,
      bypassCache,
    );
  }

  async intelligentAutofill(
    information: InformationData,
    formHtml: string,
    formText: string | undefined,
    pageUrl: string,
    jobContext: JobContext | undefined,
    config: OpenAIConfigDto,
  ): Promise<IntelligentAutofillResponse> {
    return this.autofillService.intelligentAutofill(
      information,
      formHtml,
      formText,
      pageUrl,
      jobContext,
      config,
    );
  }

  async questionAutofill(
    information: InformationData,
    questions: QuestionItem[],
    jobContext: QuestionJobContext | undefined,
    config: OpenAIConfigDto,
    pageUrl?: string,
    instructions?: string,
  ): Promise<QuestionAutofillResponse> {
    return this.autofillService.questionAutofill(
      information,
      questions,
      jobContext,
      config,
      pageUrl,
      instructions,
    );
  }
}

export { AIService as OpenAIService };
