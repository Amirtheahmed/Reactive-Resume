// apps/server/src/cover-letter/cover-letter.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  InternalServerErrorException,
  Logger,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { User as UserEntity } from "@prisma/client";
import { CreateCoverLetterDto, GenerateCoverLetterDto, UpdateCoverLetterDto } from "@reactive-resume/dto";

import { TwoFactorGuard } from "@/server/auth/guards/two-factor.guard";
import { User } from "@/server/user/decorators/user.decorator";

import { CoverLetterService } from "./cover-letter.service";

@ApiTags("Cover Letter")
@Controller("cover-letter")
@UseGuards(TwoFactorGuard)
export class CoverLetterController {
  constructor(private readonly coverLetterService: CoverLetterService) {}

  @Post()
  create(@User() user: UserEntity, @Body() createCoverLetterDto: CreateCoverLetterDto) {
    return this.coverLetterService.create(user.id, createCoverLetterDto);
  }

  @Post("generate")
  async generate(@User() user: UserEntity, @Body() generateCoverLetterDto: GenerateCoverLetterDto) {
    try {
      return await this.coverLetterService.generate(user.id, generateCoverLetterDto);
    } catch (error) {
      Logger.error(error);
      throw new InternalServerErrorException(error);
    }
  }

  @Get()
  findAll(@User() user: UserEntity) {
    return this.coverLetterService.findAll(user.id);
  }

  @Get(":id")
  findOne(@User() user: UserEntity, @Param("id") id: string) {
    return this.coverLetterService.findOne(id, user.id);
  }

  @Patch(":id")
  update(
    @User() user: UserEntity,
    @Param("id") id: string,
    @Body() updateCoverLetterDto: UpdateCoverLetterDto,
  ) {
    return this.coverLetterService.update(user.id, id, updateCoverLetterDto);
  }

  @Delete(":id")
  remove(@User() user: UserEntity, @Param("id") id: string) {
    return this.coverLetterService.remove(user.id, id);
  }

  @Get("print/:id")
  @UseGuards(TwoFactorGuard)
  async print(@User() user: UserEntity, @Param("id") id: string): Promise<{ url: string }> {
    try {
        const url = await this.coverLetterService.print(id, user.id);
        return { url };
      } catch (error) {
        Logger.error(error);
        throw new InternalServerErrorException(error);
      }
  }
}
