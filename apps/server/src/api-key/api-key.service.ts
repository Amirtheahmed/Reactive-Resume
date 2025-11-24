import { randomBytes } from "node:crypto";

import { Injectable, NotFoundException } from "@nestjs/common";
import { CreateApiKeyDto } from "@reactive-resume/dto";
import * as bcryptjs from "bcryptjs";
import { PrismaService } from "nestjs-prisma";

@Injectable()
export class ApiKeyService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createApiKeyDto: CreateApiKeyDto) {
    // Generate a secure random secret
    const secret = randomBytes(32).toString("hex");
    const hash = await bcryptjs.hash(secret, 10);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        userId,
        name: createApiKeyDto.name,
        keyHash: hash,
      },
    });

    // Return the full key to the user (rx_{id}.{secret})
    // This is the only time the secret is available
    return {
      ...apiKey,
      secretKey: `rx_${apiKey.id}.${secret}`,
    };
  }

  findAll(userId: string) {
    return this.prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        lastUsed: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async remove(userId: string, id: string) {
    try {
      return await this.prisma.apiKey.delete({
        where: { id, userId },
      });
    } catch {
      throw new NotFoundException("API Key not found");
    }
  }

  async validate(key: string) {
    // Expected format: rx_{id}.{secret}
    const regex = /^rx_([\da-z]+)\.(.+)$/;
    const match = regex.exec(key);

    if (!match) return null;

    const [, id, secret] = match;

    const apiKey = await this.prisma.apiKey.findUnique({
      where: { id },
      include: { user: { include: { secrets: true } } },
    });

    if (!apiKey) return null;

    const isValid = await bcryptjs.compare(secret, apiKey.keyHash);

    if (!isValid) return null;

    // Update last used timestamp asynchronously
    await this.prisma.apiKey.update({
      where: { id },
      data: { lastUsed: new Date() },
    });

    return apiKey.user;
  }
}
