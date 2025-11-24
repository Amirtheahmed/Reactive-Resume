import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ExtensionGenerateResumeDto } from "@reactive-resume/dto";
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

  async generateResume(userId: string, data: ExtensionGenerateResumeDto) {
    try {
      // 1. Fetch User Info
      const information = await this.informationService.findAll(userId);
      const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

      // 2. Construct Title/Slug
      const title = `${data.jobTitle} @ ${data.companyName ?? "Company"}`;
      const slug = slugify(title);

      // 3. Check for OpenAI Key (User's key is preferred, but extension flow might rely on server config if we allow it)
      // For this implementation, we assume the user has configured an API Key in their settings which we fetch via the user record,
      // OR we use a system key if configured (optional, but better to stick to user ownership).
      // However, the OpenAIService expects a config object.

      // We need to decide where the API Key comes from for the extension.
      // Ideally, the extension sends the key if stored locally, OR the server uses the user's stored key if we implemented server-side key storage.
      // Current architecture: Keys are browser-local.

      // CRITICAL: The extension currently doesn't send the OpenAI Config because it assumes "headless" operation.
      // We need to either:
      // A) Pass the OpenAI config from the extension (user has to set it up in extension settings).
      // B) Use a server-side key (if self-hosted).

      // Let's check if the server has a global key configured.
      const openAiConfig = {
        provider: 'openai' as const,
        apiKey: process.env.OPENAI_API_KEY,
        model: 'gpt-4o',
        isAzure: false,
      };

      if (!openAiConfig.apiKey) {
        throw new BadRequestException("Server-side OpenAI API Key is not configured. Please ensure the server has an API key or pass one in the request.");
      }

      // 4. Generate Resume Data
      const generatedData = await this.openaiService.generateResume(
        information.data as InformationData,
        data.jobDescription,
        openAiConfig,
      );

      // 5. Create Resume Record
      // Merge with default metadata to ensure template is set
      const finalData: ResumeData = {
        ...generatedData,
        basics: {
          ...generatedData.basics,
          name: user.name,
          email: user.email,
          picture: {
            url: user.picture ?? "",
            size: 0,
            aspectRatio: 0,
            borderRadius: 0,
            effects: {
              hidden: false,
              border: false,
              grayscale: false,
            },
          },
        },
        metadata: {
          ...generatedData.metadata,
          template: data.template,
        },
      };

      const resume = await this.prisma.resume.create({
        data: {
          userId,
          title,
          slug,
          visibility: "private",
          data: finalData,
        },
      });

      // 6. Generate PDF
      // We map to ResumeDto roughly here to satisfy the printer service
      const resumeDto = {
        ...resume,
        data: finalData,
        createdAt: resume.createdAt,
        updatedAt: resume.updatedAt,
      };

      // We use the printResume method which handles storage upload
      const pdfUrl = await this.printerService.printResume(resumeDto);

      // 7. Generate Preview Image
      const previewUrl = await this.printerService.printPreview(resumeDto);

      return {
        id: resume.id,
        title: resume.title,
        pdfUrl,
        previewUrl,
      };

    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException(ErrorMessage.SomethingWentWrong);
    }
  }
}
