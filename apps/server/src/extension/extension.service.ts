// apps/server/src/extension/extension.service.ts
import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import {
  ExtensionGenerateResumeDto,
  OpenAIConfigDto,
  ResumeDto,
  UserWithSecrets,
} from "@reactive-resume/dto";
import { InformationData, ResumeData } from "@reactive-resume/schema";
import { ErrorMessage } from "@reactive-resume/utils";
import slugify from "@sindresorhus/slugify";
import { PrismaService } from "nestjs-prisma";

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
  ) {}

  async getInformation(userId: string) {
    const info = await this.informationService.findAll(userId);
    return info;
  }

  async generateResume(user: UserWithSecrets, data: ExtensionGenerateResumeDto) {
    try {
      const information = await this.informationService.findAll(user.id);

      const title = `${data.jobTitle} @ ${data.companyName ?? "Company"}`;
      const slug = slugify(title);

      // Pull AI config from the user's secrets instead of the request body
      const userAiConfig = user.secrets;
      if (!userAiConfig?.aiApiKey) {
        throw new BadRequestException(
          "AI API Key is not configured in your Reactive Resume account. Please add it in Settings -> AI Integration.",
        );
      }

      const openAiConfig: OpenAIConfigDto = {
        provider: userAiConfig.aiProvider as OpenAIConfigDto["provider"] ?? "openai",
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
        openAiConfig, // Pass the user's config
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
}
