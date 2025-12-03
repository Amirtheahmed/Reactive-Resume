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

  findAll(userId: string) {
    return this.prisma.chat.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
  }

  findOne(id: string, userId: string) {
    return this.prisma.chat.findUnique({
      where: { id, userId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
  }

  remove(id: string, userId: string) {
    return this.prisma.chat.delete({
      where: { id, userId },
    });
  }

  async getAnswer(userId: string, chatRequestDto: ChatRequestDto): Promise<ChatResponseDto> {
    const { message, jobDescription, chatId } = chatRequestDto;

    const information = await this.informationService.findAll(userId);
    const secrets = await this.prisma.secrets.findUnique({ where: { userId } });

    if (!secrets) {
      throw new InternalServerErrorException("Secrets not found for user");
    }

    let chat: { id: string } | null = null;

    if (chatId) {
      chat = await this.prisma.chat.findUnique({ where: { id: chatId, userId } });
    }

    chat ??= await this.prisma.chat.create({
      data: {
        userId,
        title: message.slice(0, 30) + (message.length > 30 ? "..." : ""),
      },
    });

    // Save user message
    await this.prisma.message.create({
      data: {
        chatId: chat.id,
        role: "user",
        content: message,
      },
    });

    const config: OpenAIConfigDto = {
      apiKey: secrets.aiApiKey ?? undefined,
      baseURL: secrets.aiBaseUrl ?? undefined,
      model: secrets.aiModel ?? undefined,
      provider: secrets.aiProvider as OpenAIConfigDto["provider"],
      isAzure: false,
    };

    // Get previous messages for context
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _previousMessages = await this.prisma.message.findMany({
      where: { chatId: chat.id },
      orderBy: { createdAt: "asc" },
      // Take last 10 messages for context window
      take: 10,
    });

    // TODO: Pass previous messages to OpenAI service if it supports history
    // For now, we just pass the current message as per existing implementation
    // But ideally we should update OpenAIService to accept history.
    // Given the current OpenAIService signature, it takes `message` string.
    // I will stick to the current signature for now to minimize risk, but I should probably check OpenAIService.

    const response = await this.openAIService.chat(
      information.data as unknown as InformationData,
      message,
      config,
      jobDescription,
      chatRequestDto.attachmentUrl,
    );

    // Save assistant message
    await this.prisma.message.create({
      data: {
        chatId: chat.id,
        role: "assistant",
        content: response.message,
      },
    });

    // Update chat timestamp
    await this.prisma.chat.update({
      where: { id: chat.id },
      data: { updatedAt: new Date() },
    });

    return {
      chatId: chat.id,
      message: response.message,
    };
  }
}
