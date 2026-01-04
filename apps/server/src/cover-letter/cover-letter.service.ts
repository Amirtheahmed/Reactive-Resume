import { BadRequestException, Injectable } from "@nestjs/common";
import {
  CreateCoverLetterDto,
  GenerateCoverLetterDto,
  OpenAIConfigDto,
  UpdateCoverLetterDto,
} from "@reactive-resume/dto";
import { InformationData } from "@reactive-resume/schema";
import slugify from "@sindresorhus/slugify";
import { PrismaService } from "nestjs-prisma";

import { InformationService } from "@/server/information/information.service";
import { OpenAIService } from "@/server/openai/openai.service";
import { PrinterService } from "@/server/printer/printer.service";
import { UserService } from "@/server/user/user.service";

@Injectable()
export class CoverLetterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly informationService: InformationService,
    private readonly openaiService: OpenAIService,
    private readonly printerService: PrinterService,
    private readonly userService: UserService,
  ) {}

  async create(userId: string, createCoverLetterDto: CreateCoverLetterDto) {
    return await this.prisma.coverLetter.create({
      data: {
        userId,
        title: createCoverLetterDto.title,
        slug: createCoverLetterDto.slug ?? slugify(createCoverLetterDto.title),
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        content: createCoverLetterDto.content ?? "",
      },
    });
  }

  findAll(userId: string) {
    return this.prisma.coverLetter.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } });
  }

  findOne(id: string, userId: string) {
    return this.prisma.coverLetter.findUniqueOrThrow({ where: { userId_id: { userId, id } } });
  }

  async update(userId: string, id: string, updateCoverLetterDto: UpdateCoverLetterDto) {
    return await this.prisma.coverLetter.update({
      data: updateCoverLetterDto,
      where: { userId_id: { userId, id } },
    });
  }

  async remove(userId: string, id: string) {
    return await this.prisma.coverLetter.delete({ where: { userId_id: { userId, id } } });
  }

  async print(id: string, userId: string) {
    const coverLetter = await this.findOne(id, userId);
    const url = await this.printerService.printCoverLetter(coverLetter);
    return url;
  }

  async generate(userId: string, generateCoverLetterDto: GenerateCoverLetterDto) {
    const { jobDescription, title, slug } = generateCoverLetterDto;

    const user = await this.userService.findOneById(userId);
    if (!user.secrets?.aiApiKey) {
      throw new BadRequestException("AI API Key is not configured for this user.");
    }

    const openAiConfig: OpenAIConfigDto = {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      provider: (user.secrets.aiProvider as OpenAIConfigDto["provider"]) ?? "openai",
      apiKey: user.secrets.aiApiKey,
      baseURL: user.secrets.aiBaseUrl ?? undefined,
      model: user.secrets.aiModel ?? undefined,
      maxTokens: user.secrets.aiMaxTokens ?? undefined,
      isAzure: user.secrets.aiProvider === "azure",
      azureApiVersion: user.secrets.aiAzureApiVersion ?? undefined,
    };

    const information = await this.informationService.findAll(userId);
    const { content } = await this.openaiService.generateCoverLetter(
      information.data as InformationData,
      jobDescription,
      openAiConfig,
      userId,
    );

    return this.prisma.coverLetter.create({
      data: {
        userId,
        title,
        slug: slug ?? slugify(title),
        content,
      },
    });
  }
}
