// apps/server/src/extension/extension.service.ts
import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import {
  AutofillMapRequestDto,
  ExtensionGenerateCoverLetterDto,
  ExtensionGenerateResumeDto,
  OpenAIConfigDto,
  ResumeDto,
  UserWithSecrets,
} from "@reactive-resume/dto";
import { InformationData, ResumeData } from "@reactive-resume/schema";
import { ErrorMessage } from "@reactive-resume/utils";
import slugify from "@sindresorhus/slugify";
import { PrismaService } from "nestjs-prisma";

import { CoverLetterService } from "@/server/cover-letter/cover-letter.service";
import { InformationService } from "@/server/information/information.service";
import { OpenAIService } from "@/server/openai/openai.service";
import { PrinterService } from "@/server/printer/printer.service";
import { ResumeService } from "@/server/resume/resume.service";

@Injectable()
export class ExtensionService {
  private readonly logger = new Logger(ExtensionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly informationService: InformationService,
    private readonly openaiService: OpenAIService,
    private readonly resumeService: ResumeService,
    private readonly printerService: PrinterService,
    private readonly coverLetterService: CoverLetterService,
  ) {}

  async getInformation(userId: string) {
    const info = await this.informationService.findAll(userId);
    return info;
  }

  async generateResume(user: UserWithSecrets, data: ExtensionGenerateResumeDto) {
    try {
      const information = await this.informationService.findAll(user.id);

      const baseTitle = `${data.jobTitle} @ ${data.companyName ?? "Company"}`;
      const baseSlug = slugify(baseTitle);

      const { title, slug } = await this.ensureUniqueTitleAndSlug(
        user.id,
        baseTitle,
        baseSlug,
        "resume",
      );

      // Pull AI config from the user's secrets instead of the request body
      const userAiConfig = user.secrets;
      if (!userAiConfig?.aiApiKey) {
        throw new BadRequestException(
          "AI API Key is not configured in your Reactive Resume account. Please add it in Settings -> AI Integration.",
        );
      }

      const openAiConfig: OpenAIConfigDto = {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        provider: (userAiConfig.aiProvider as OpenAIConfigDto["provider"]) ?? "openai",
        apiKey: userAiConfig.aiApiKey,
        baseURL: userAiConfig.aiBaseUrl ?? undefined,
        model: userAiConfig.aiModel ?? undefined,
        maxTokens: userAiConfig.aiMaxTokens ?? undefined,
        isAzure: userAiConfig.aiProvider === "azure", // Sync legacy flag
        azureApiVersion: userAiConfig.aiAzureApiVersion ?? undefined,
      };

      const generatedData = await this.openaiService.generateResume(
        information.data as InformationData,
        data.jobDescription,
        openAiConfig,
        user.id,
      );

      const finalData: ResumeData = {
        ...generatedData,
        basics: {
          ...generatedData.basics,
          name: user.name,
          email: user.email,
          picture: {
            url: user.picture ?? "",
            size: 120,
            aspectRatio: 1,
            borderRadius: 999,
            effects: { hidden: false, border: false, grayscale: false },
          },
        },
        metadata: {
          ...generatedData.metadata,
          template: data.template,
        },
      };

      const resume = await this.prisma.resume.create({
        data: {
          userId: user.id,
          title,
          slug,
          visibility: "private",
          data: finalData,
        },
      });

      const resumeDto: ResumeDto = {
        ...resume,
        data: finalData,
        createdAt: resume.createdAt,
        updatedAt: resume.updatedAt,
      };

      const [pdfUrl, previewUrl] = await Promise.all([
        this.printerService.printResume(resumeDto),
        this.printerService.printPreview(resumeDto),
      ]);

      return {
        id: resume.id,
        title: resume.title,
        pdfUrl,
        previewUrl,
      };
    } catch (error) {
      this.logger.error(error);
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(ErrorMessage.SomethingWentWrong);
    }
  }

  async generateCoverLetter(user: UserWithSecrets, data: ExtensionGenerateCoverLetterDto) {
    try {
      const information = await this.informationService.findAll(user.id);

      const baseTitle = `${data.jobTitle} @ ${data.companyName ?? "Company"}`;
      const baseSlug = slugify(baseTitle);

      const { title, slug } = await this.ensureUniqueTitleAndSlug(
        user.id,
        baseTitle,
        baseSlug,
        "coverLetter",
      );

      const userAiConfig = user.secrets;
      if (!userAiConfig?.aiApiKey) {
        throw new BadRequestException(
          "AI API Key is not configured in your Reactive Resume account. Please add it in Settings -> AI Integration.",
        );
      }

      const openAiConfig: OpenAIConfigDto = {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        provider: (userAiConfig.aiProvider as OpenAIConfigDto["provider"]) ?? "openai",
        apiKey: userAiConfig.aiApiKey,
        baseURL: userAiConfig.aiBaseUrl ?? undefined,
        model: userAiConfig.aiModel ?? undefined,
        maxTokens: userAiConfig.aiMaxTokens ?? undefined,
        isAzure: userAiConfig.aiProvider === "azure",
        azureApiVersion: userAiConfig.aiAzureApiVersion ?? undefined,
      };

      const { content } = await this.openaiService.generateCoverLetter(
        information.data as InformationData,
        data.jobDescription,
        openAiConfig,
        user.id,
      );

      const coverLetter = await this.coverLetterService.create(user.id, {
        title,
        slug,
        content,
      });

      const pdfUrl = await this.printerService.printCoverLetter(coverLetter);

      return {
        id: coverLetter.id,
        title: coverLetter.title,
        pdfUrl,
        editorUrl: `/dashboard/cover-letters/${coverLetter.id}`,
      };
    } catch (error) {
      this.logger.error(error);
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(ErrorMessage.SomethingWentWrong);
    }
  }

  async createAutofillMap(user: UserWithSecrets, data: AutofillMapRequestDto) {
    try {
      const information = await this.informationService.findAll(user.id);

      const userAiConfig = user.secrets;
      if (!userAiConfig?.aiApiKey) {
        throw new BadRequestException(
          "AI API Key is not configured in your Reactive Resume account. Please add it in Settings -> AI Integration.",
        );
      }

      const openAiConfig: OpenAIConfigDto = {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        provider: (userAiConfig.aiProvider as OpenAIConfigDto["provider"]) ?? "openai",
        apiKey: userAiConfig.aiApiKey,
        baseURL: userAiConfig.aiBaseUrl ?? undefined,
        model: userAiConfig.aiModel ?? undefined,
        maxTokens: userAiConfig.aiMaxTokens ?? undefined,
        isAzure: userAiConfig.aiProvider === "azure",
        azureApiVersion: userAiConfig.aiAzureApiVersion ?? undefined,
      };

      return this.openaiService.createAutofillMap(
        information.data as InformationData,
        data.fields,
        openAiConfig,
        data.jobDescription,
        user.id,
      );
    } catch (error) {
      this.logger.error(error);
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(ErrorMessage.SomethingWentWrong);
    }
  }

  private async ensureUniqueTitleAndSlug(
    userId: string,
    baseTitle: string,
    baseSlug: string,
    type: "resume" | "coverLetter",
  ): Promise<{ title: string; slug: string }> {
    let title = baseTitle;
    let slug = baseSlug;
    let counter = 2;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition,no-constant-condition
    while (true) {
      const existing =
        type === "resume"
          ? await this.prisma.resume.findFirst({
              where: { userId, slug },
              select: { id: true },
            })
          : await this.prisma.coverLetter.findFirst({
              where: { userId, slug },
              select: { id: true },
            });

      if (!existing) {
        return { title, slug };
      }

      title = `${baseTitle} ${counter}`;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }
}
