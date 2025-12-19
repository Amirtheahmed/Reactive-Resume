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
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
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
  @ApiOperation({
    summary: "Create Cover Letter",
    description: "Creates a new cover letter for the authenticated user.",
  })
  @ApiResponse({ status: 201, description: "Cover letter created successfully." })
  @ApiResponse({ status: 400, description: "Bad request." })
  create(@User() user: UserEntity, @Body() createCoverLetterDto: CreateCoverLetterDto) {
    return this.coverLetterService.create(user.id, createCoverLetterDto);
  }

  @Post("generate")
  @ApiOperation({
    summary: "Generate Cover Letter",
    description: "Generates cover letter content using AI based on job description.",
  })
  @ApiResponse({ status: 201, description: "Cover letter generated successfully." })
  async generate(@User() user: UserEntity, @Body() generateCoverLetterDto: GenerateCoverLetterDto) {
    try {
      return await this.coverLetterService.generate(user.id, generateCoverLetterDto);
    } catch (error) {
      Logger.error(error);
      throw new InternalServerErrorException(error);
    }
  }

  @Get()
  @ApiOperation({
    summary: "List Cover Letters",
    description: "Retrieves all cover letters belonging to the authenticated user.",
  })
  @ApiResponse({ status: 200, description: "List of cover letters retrieved successfully." })
  findAll(@User() user: UserEntity) {
    return this.coverLetterService.findAll(user.id);
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get Cover Letter",
    description: "Retrieves a specific cover letter by ID.",
  })
  @ApiParam({ name: "id", description: "Cover Letter ID" })
  @ApiResponse({ status: 200, description: "Cover letter retrieved successfully." })
  @ApiResponse({ status: 404, description: "Cover letter not found." })
  findOne(@User() user: UserEntity, @Param("id") id: string) {
    return this.coverLetterService.findOne(id, user.id);
  }

  @Patch(":id")
  @ApiOperation({
    summary: "Update Cover Letter",
    description: "Updates a specific cover letter.",
  })
  @ApiParam({ name: "id", description: "Cover Letter ID" })
  @ApiResponse({ status: 200, description: "Cover letter updated successfully." })
  @ApiResponse({ status: 404, description: "Cover letter not found." })
  update(
    @User() user: UserEntity,
    @Param("id") id: string,
    @Body() updateCoverLetterDto: UpdateCoverLetterDto,
  ) {
    return this.coverLetterService.update(user.id, id, updateCoverLetterDto);
  }

  @Delete(":id")
  @ApiOperation({
    summary: "Delete Cover Letter",
    description: "Permanently deletes a cover letter.",
  })
  @ApiParam({ name: "id", description: "Cover Letter ID" })
  @ApiResponse({ status: 200, description: "Cover letter deleted successfully." })
  @ApiResponse({ status: 404, description: "Cover letter not found." })
  remove(@User() user: UserEntity, @Param("id") id: string) {
    return this.coverLetterService.remove(user.id, id);
  }

  @Get("print/:id")
  @UseGuards(TwoFactorGuard)
  @ApiOperation({
    summary: "Print Cover Letter to PDF",
    description: "Generates a PDF URL for the cover letter.",
  })
  @ApiParam({ name: "id", description: "Cover Letter ID" })
  @ApiResponse({ status: 200, description: "PDF URL generated successfully." })
  @ApiResponse({ status: 404, description: "Cover letter not found." })
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
