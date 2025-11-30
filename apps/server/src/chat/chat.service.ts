import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ChatRequestDto, ChatResponseDto, OpenAIConfigDto } from "@reactive-resume/dto";
import { InformationData } from "@reactive-resume/schema";
import { PrismaService } from "nestjs-prisma";

import { InformationService } from "@/server/information/information.service";
import { OpenAIService } from "@/server/openai/openai.service";

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly informationService: InformationService,
    private readonly openAIService: OpenAIService,
  ) {}

  async getAnswer(userId: string, chatRequestDto: ChatRequestDto): Promise<ChatResponseDto> {
    const { message, jobDescription } = chatRequestDto;

    const information = await this.informationService.findAll(userId);
    const secrets = await this.prisma.secrets.findUnique({ where: { userId } });

    if (!secrets) {
      throw new InternalServerErrorException("Secrets not found for user");
    }

    const config: OpenAIConfigDto = {
      apiKey: secrets.aiApiKey ?? undefined,
      baseURL: secrets.aiBaseUrl ?? undefined,
      model: secrets.aiModel ?? undefined,
      provider: secrets.aiProvider as OpenAIConfigDto["provider"],
      isAzure: false,
    };

    return this.openAIService.chat(information.data as unknown as InformationData, message, config, jobDescription);
  }
}
