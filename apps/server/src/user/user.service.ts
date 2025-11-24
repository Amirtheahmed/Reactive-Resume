import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { Prisma, User } from "@prisma/client";
import { OpenAIConfigDto, UserWithSecrets } from "@reactive-resume/dto";
import { ErrorMessage } from "@reactive-resume/utils";
import { PrismaService } from "nestjs-prisma";

import { StorageService } from "../storage/storage.service";

type AiSettingsData = {
  provider: string | null;
  baseURL: string | null;
  model: string | null;
  maxTokens: number | null;
  azureApiVersion: string | null;
  isApiKeySet: boolean;
};

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async findOneById(id: string): Promise<UserWithSecrets> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id },
      include: { secrets: true },
    });

    if (!user.secrets) {
      throw new InternalServerErrorException(ErrorMessage.SecretsNotFound);
    }

    return user;
  }

  async findOneByIdentifier(identifier: string): Promise<UserWithSecrets | null> {
    const user = await (async (identifier: string) => {
      // First, find the user by email
      const user = await this.prisma.user.findUnique({
        where: { email: identifier },
        include: { secrets: true },
      });

      // If the user exists, return it
      if (user) return user;

      // Otherwise, find the user by username
      // If the user doesn't exist, throw an error
      return this.prisma.user.findUnique({
        where: { username: identifier },
        include: { secrets: true },
      });
    })(identifier);

    return user;
  }

  async findOneByIdentifierOrThrow(identifier: string): Promise<UserWithSecrets> {
    const user = await (async (identifier: string) => {
      // First, find the user by email
      const user = await this.prisma.user.findUnique({
        where: { email: identifier },
        include: { secrets: true },
      });

      // If the user exists, return it
      if (user) return user;

      // Otherwise, find the user by username
      // If the user doesn't exist, throw an error
      return this.prisma.user.findUniqueOrThrow({
        where: { username: identifier },
        include: { secrets: true },
      });
    })(identifier);

    return user;
  }

  create(data: Prisma.UserCreateInput): Promise<UserWithSecrets> {
    return this.prisma.user.create({ data, include: { secrets: true } });
  }

  updateByEmail(email: string, data: Prisma.UserUpdateArgs["data"]): Promise<User> {
    return this.prisma.user.update({ where: { email }, data });
  }

  async updateByResetToken(
    resetToken: string,
    data: Prisma.SecretsUpdateArgs["data"],
  ): Promise<void> {
    await this.prisma.secrets.update({ where: { resetToken }, data });
  }

  async deleteOneById(id: string): Promise<void> {
    await Promise.all([
      this.storageService.deleteFolder(id),
      this.prisma.user.delete({ where: { id } }),
    ]);
  }

  async getAiSettings(userId: string): Promise<AiSettingsData> {
    const secrets = await this.prisma.secrets.findUnique({
      where: { userId },
      select: {
        aiProvider: true,
        aiApiKey: true,
        aiBaseUrl: true,
        aiModel: true,
        aiMaxTokens: true,
        aiAzureApiVersion: true,
      },
    });

    if (!secrets) {
      // This case should ideally not happen for an existing user
      return {
        provider: "openai",
        baseURL: null,
        model: null,
        maxTokens: null,
        azureApiVersion: null,
        isApiKeySet: false,
      };
    }

    return {
      provider: secrets.aiProvider,
      baseURL: secrets.aiBaseUrl,
      model: secrets.aiModel,
      maxTokens: secrets.aiMaxTokens,
      azureApiVersion: secrets.aiAzureApiVersion,
      isApiKeySet: !!secrets.aiApiKey,
    };
  }

  async updateAiSettings(userId: string, data: OpenAIConfigDto) {
    const updateData: Prisma.SecretsUpdateInput = {
      aiProvider: data.provider,
      aiBaseUrl: data.baseURL,
      aiModel: data.model,
      aiMaxTokens: data.maxTokens,
      aiAzureApiVersion: data.azureApiVersion,
    };

    if (data.apiKey && data.apiKey.trim() !== "") {
      updateData.aiApiKey = data.apiKey;
    }

    return this.prisma.secrets.update({
      where: { userId },
      data: updateData,
    });
  }
}
