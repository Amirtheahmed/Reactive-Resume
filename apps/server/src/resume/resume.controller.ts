import {
  BadRequestException,
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
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { User as UserEntity } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import {
  CreateResumeDto,
  GenerateResumeDto,
  ImportResumeDto,
  importResumeSchema,
  ResumeDto,
  UpdateResumeDto,
} from "@reactive-resume/dto";
import { ResumeData, resumeDataSchema } from "@reactive-resume/schema";
import { ErrorMessage } from "@reactive-resume/utils";
import set from "lodash.set";
import { zodToJsonSchema } from "zod-to-json-schema";

import { User } from "@/server/user/decorators/user.decorator";

import { OptionalGuard } from "../auth/guards/optional.guard";
import { TwoFactorGuard } from "../auth/guards/two-factor.guard";
import { Resume } from "./decorators/resume.decorator";
import { ResumeGuard } from "./guards/resume.guard";
import { ResumeService } from "./resume.service";

@ApiTags("Resume")
@Controller("resume")
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  @Get("schema")
  @ApiOperation({
    summary: "Get Resume Schema",
    description: "Returns the JSON Schema for the resume data structure.",
  })
  @ApiResponse({ status: 200, description: "Schema retrieved successfully." })
  getSchema() {
    return zodToJsonSchema(resumeDataSchema);
  }

  @Post()
  @UseGuards(TwoFactorGuard)
  @ApiOperation({
    summary: "Create Resume",
    description: "Creates a new resume for the authenticated user.",
  })
  @ApiResponse({ status: 201, description: "Resume created successfully.", type: ResumeDto })
  @ApiResponse({ status: 400, description: "Bad request or resume slug already exists." })
  async create(@User() user: UserEntity, @Body() createResumeDto: CreateResumeDto) {
    try {
      return await this.resumeService.create(user.id, createResumeDto);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
        throw new BadRequestException(ErrorMessage.ResumeSlugAlreadyExists);
      }

      Logger.error(error);
      throw new InternalServerErrorException(error);
    }
  }

  @Post("import")
  @UseGuards(TwoFactorGuard)
  @ApiOperation({
    summary: "Import Resume",
    description: "Imports a resume from an external source (e.g., LinkedIn, JSON Resume).",
  })
  @ApiBody({ type: ImportResumeDto })
  @ApiResponse({ status: 201, description: "Resume imported successfully.", type: ResumeDto })
  @ApiResponse({ status: 400, description: "Bad request or invalid format." })
  async import(@User() user: UserEntity, @Body() importResumeDto: ImportResumeDto) {
    try {
      const result = importResumeSchema.parse(importResumeDto);
      return await this.resumeService.import(user.id, result);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
        throw new BadRequestException(ErrorMessage.ResumeSlugAlreadyExists);
      }

      Logger.error(error);
      throw new InternalServerErrorException(error);
    }
  }

  @Get()
  @UseGuards(TwoFactorGuard)
  @ApiOperation({
    summary: "List Resumes",
    description: "Retrieves all resumes belonging to the authenticated user.",
  })
  @ApiResponse({ status: 200, description: "List of resumes retrieved successfully.", type: [ResumeDto] })
  findAll(@User() user: UserEntity) {
    return this.resumeService.findAll(user.id);
  }

  @Get(":id")
  @UseGuards(TwoFactorGuard, ResumeGuard)
  @ApiOperation({
    summary: "Get Resume",
    description: "Retrieves a specific resume by ID.",
  })
  @ApiParam({ name: "id", description: "Resume ID" })
  @ApiResponse({ status: 200, description: "Resume retrieved successfully.", type: ResumeDto })
  @ApiResponse({ status: 404, description: "Resume not found." })
  findOne(@Resume() resume: ResumeDto) {
    return resume;
  }

  @Get(":id/statistics")
  @UseGuards(TwoFactorGuard)
  @ApiOperation({
    summary: "Get Resume Statistics",
    description: "Retrieves statistics (views, downloads) for a specific resume.",
  })
  @ApiParam({ name: "id", description: "Resume ID" })
  @ApiResponse({ status: 200, description: "Statistics retrieved successfully." })
  findOneStatistics(@Param("id") id: string) {
    return this.resumeService.findOneStatistics(id);
  }

  @Get("/public/:username/:slug")
  @UseGuards(OptionalGuard)
  @ApiOperation({
    summary: "Get Public Resume",
    description: "Retrieves a public resume by username and slug.",
  })
  @ApiParam({ name: "username", description: "Username of the resume owner" })
  @ApiParam({ name: "slug", description: "Slug of the resume" })
  @ApiResponse({ status: 200, description: "Public resume retrieved successfully." })
  @ApiResponse({ status: 404, description: "Resume not found or private." })
  async findOneByUsernameSlug(
    @Param("username") username: string,
    @Param("slug") slug: string,
    @User("id") userId: string,
  ) {
    const resume = await this.resumeService.findOneByUsernameSlug(username, slug, userId);

    // Hide private notes from public resume API responses
    set(resume.data as ResumeData, "metadata.notes", undefined);

    return resume;
  }

  @Patch(":id")
  @UseGuards(TwoFactorGuard)
  @ApiOperation({
    summary: "Update Resume",
    description: "Updates a specific resume.",
  })
  @ApiParam({ name: "id", description: "Resume ID" })
  @ApiResponse({ status: 200, description: "Resume updated successfully.", type: ResumeDto })
  @ApiResponse({ status: 400, description: "Bad request." })
  update(
    @User() user: UserEntity,
    @Param("id") id: string,
    @Body() updateResumeDto: UpdateResumeDto,
  ) {
    return this.resumeService.update(user.id, id, updateResumeDto);
  }

  @Patch(":id/lock")
  @UseGuards(TwoFactorGuard)
  @ApiOperation({
    summary: "Lock/Unlock Resume",
    description: "Locks or unlocks a resume to prevent accidental edits.",
  })
  @ApiParam({ name: "id", description: "Resume ID" })
  @ApiBody({ schema: { type: "object", properties: { set: { type: "boolean" } } } })
  @ApiResponse({ status: 200, description: "Resume lock status updated successfully." })
  lock(@User() user: UserEntity, @Param("id") id: string, @Body("set") set = true) {
    return this.resumeService.lock(user.id, id, set);
  }

  @Delete(":id")
  @UseGuards(TwoFactorGuard)
  @ApiOperation({
    summary: "Delete Resume",
    description: "Permanently deletes a resume.",
  })
  @ApiParam({ name: "id", description: "Resume ID" })
  @ApiResponse({ status: 200, description: "Resume deleted successfully." })
  remove(@User() user: UserEntity, @Param("id") id: string) {
    return this.resumeService.remove(user.id, id);
  }

  @Get("/print/:id")
  @UseGuards(OptionalGuard, ResumeGuard)
  @ApiOperation({
    summary: "Print Resume to PDF",
    description: "Generates a PDF URL for the resume.",
  })
  @ApiParam({ name: "id", description: "Resume ID" })
  @ApiResponse({ status: 200, description: "PDF URL generated successfully." })
  async printResume(@User("id") userId: string | undefined, @Resume() resume: ResumeDto) {
    try {
      const url = await this.resumeService.printResume(resume, userId);

      return { url };
    } catch (error) {
      Logger.error(error);
      throw new InternalServerErrorException(error);
    }
  }

  @Post("generate")
  @UseGuards(TwoFactorGuard)
  @ApiOperation({
    summary: "Generate Resume with AI",
    description: "Generates resume content using AI based on job description.",
  })
  @ApiResponse({ status: 201, description: "Resume generated successfully.", type: ResumeDto })
  async generate(@User() user: UserEntity, @Body() generateResumeDto: GenerateResumeDto) {
    try {
      return await this.resumeService.generate(user.id, generateResumeDto);
    } catch (error) {
      Logger.error(error);
      throw new InternalServerErrorException(error);
    }
  }

  @Get("/print/:id/preview")
  @UseGuards(TwoFactorGuard, ResumeGuard)
  @ApiOperation({
    summary: "Generate Resume Preview",
    description: "Generates a preview image URL for the resume.",
  })
  @ApiParam({ name: "id", description: "Resume ID" })
  @ApiResponse({ status: 200, description: "Preview URL generated successfully." })
  async printPreview(@Resume() resume: ResumeDto) {
    try {
      const url = await this.resumeService.printPreview(resume);

      return { url };
    } catch (error) {
      Logger.error(error);
      throw new InternalServerErrorException(error);
    }
  }
}
