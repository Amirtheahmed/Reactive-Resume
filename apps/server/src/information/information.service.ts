import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { UpdateInformationDto } from "@reactive-resume/dto";
import { defaultInformation } from "@reactive-resume/schema";
import { PrismaService } from "nestjs-prisma";

@Injectable()
export class InformationService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const info = await this.prisma.information.findUnique({ where: { userId } });

    if (!info) {
      return this.prisma.information.create({
        data: {
          userId,
          data: defaultInformation as unknown as Prisma.JsonObject,
        },
      });
    }

    return info;
  }

  async update(userId: string, updateInformationDto: UpdateInformationDto) {
    return this.prisma.information.upsert({
      where: { userId },
      create: {
        userId,
        data: updateInformationDto.data as unknown as Prisma.JsonObject,
      },
      update: {
        data: updateInformationDto.data as unknown as Prisma.JsonObject,
      },
    });
  }
}
