// apps/server/src/mobile/mobile.controller.ts
import {
  Body,
  Controller,
  createParamDecorator,
  ExecutionContext,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import type { MobileLink } from "@prisma/client";
import {
  AutofillExportDto,
  IntelligentAutofillRequestDto,
  MobileGenerateCoverLetterDto,
  MobileGenerateResumeDto,
  QuestionAutofillRequestDto,
  UpdateInformationDto,
  UserWithSecrets,
} from "@reactive-resume/dto";

import { MobileTokenGuard } from "@/server/mobile-link/guards/mobile-token.guard";
import { User } from "@/server/user/decorators/user.decorator";

import { MobileLoggingInterceptor } from "./interceptors/mobile-logging.interceptor";
import { MobileService } from "./mobile.service";

// Custom decorator to get mobile link from request
const GetMobileLink = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): MobileLink | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.mobileLink as MobileLink | undefined;
  },
);

@ApiTags("Mobile")
@ApiBearerAuth("mobile-token")
@Controller("mobile")
@UseGuards(ThrottlerGuard, MobileTokenGuard)
@UseInterceptors(MobileLoggingInterceptor)
@Throttle({ default: { limit: 600, ttl: 60_000 } }) // 60 requests per minute default
export class MobileController {
  constructor(private readonly mobileService: MobileService) {}

  // ============================================
  // User Profile
  // ============================================

  @Get("me")
  @ApiOperation({
    summary: "Get user profile",
    description: "Returns the authenticated user's profile information.",
  })
  @ApiResponse({ status: 200, description: "User profile retrieved successfully." })
  @ApiResponse({ status: 401, description: "Unauthorized - Invalid or missing token." })
  getProfile(@User("id") userId: string) {
    return this.mobileService.getUserProfile(userId);
  }

  // ============================================
  // Information Bank
  // ============================================

  @Get("information")
  @ApiOperation({
    summary: "Get information bank",
    description: "Returns the user's complete information bank (professional background data).",
  })
  @ApiResponse({ status: 200, description: "Information bank retrieved successfully." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  getInformation(@User("id") userId: string) {
    return this.mobileService.getInformation(userId);
  }

  @Patch("information")
  @ApiOperation({
    summary: "Update information bank",
    description: "Updates the user's information bank with new data.",
  })
  @ApiResponse({ status: 200, description: "Information bank updated successfully." })
  @ApiResponse({ status: 400, description: "Bad request - Invalid data." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  updateInformation(@User("id") userId: string, @Body() data: UpdateInformationDto) {
    return this.mobileService.updateInformation(userId, data);
  }

  // ============================================
  // Resumes
  // ============================================

  @Get("resumes")
  @ApiOperation({
    summary: "List resumes",
    description: "Returns a list of all resumes for the authenticated user.",
  })
  @ApiResponse({ status: 200, description: "Resumes retrieved successfully." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  listResumes(@User("id") userId: string) {
    return this.mobileService.listResumes(userId);
  }

  @Get("resumes/:id")
  @ApiOperation({
    summary: "Get resume by ID",
    description: "Returns a specific resume by its ID.",
  })
  @ApiParam({ name: "id", description: "Resume ID" })
  @ApiResponse({ status: 200, description: "Resume retrieved successfully." })
  @ApiResponse({ status: 404, description: "Resume not found." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  getResume(@User("id") userId: string, @Param("id") resumeId: string) {
    return this.mobileService.getResume(userId, resumeId);
  }

  @Get("resumes/:id/pdf")
  @ApiOperation({
    summary: "Get resume PDF URL",
    description: "Generates and returns a URL to download the resume as PDF.",
  })
  @ApiParam({ name: "id", description: "Resume ID" })
  @ApiResponse({ status: 200, description: "PDF URL generated successfully." })
  @ApiResponse({ status: 404, description: "Resume not found." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  getResumePdf(@User("id") userId: string, @Param("id") resumeId: string) {
    return this.mobileService.getResumePdfUrl(userId, resumeId);
  }

  @Post("generate-resume")
  @ApiOperation({
    summary: "Generate tailored resume",
    description:
      "Uses AI to generate a resume tailored to the provided job description. Rate limited to 10 requests per hour.",
  })
  @ApiResponse({ status: 201, description: "Resume generated successfully." })
  @ApiResponse({ status: 400, description: "Bad request - Invalid data or AI key not configured." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @ApiResponse({ status: 429, description: "Too many requests - Rate limit exceeded." })
  @Throttle({ default: { limit: 100, ttl: 3_600_000 } }) // 10 per hour for AI generation
  generateResume(
    @User() user: UserWithSecrets,
    @Body() data: MobileGenerateResumeDto,
    @GetMobileLink() mobileLink?: MobileLink,
  ) {
    return this.mobileService.generateResume(user, data, mobileLink?.id);
  }

  // ============================================
  // Cover Letters
  // ============================================

  @Get("cover-letters")
  @ApiOperation({
    summary: "List cover letters",
    description: "Returns a list of all cover letters for the authenticated user.",
  })
  @ApiResponse({ status: 200, description: "Cover letters retrieved successfully." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  listCoverLetters(@User("id") userId: string) {
    return this.mobileService.listCoverLetters(userId);
  }

  @Get("cover-letters/:id")
  @ApiOperation({
    summary: "Get cover letter by ID",
    description: "Returns a specific cover letter by its ID.",
  })
  @ApiParam({ name: "id", description: "Cover letter ID" })
  @ApiResponse({ status: 200, description: "Cover letter retrieved successfully." })
  @ApiResponse({ status: 404, description: "Cover letter not found." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  getCoverLetter(@User("id") userId: string, @Param("id") coverLetterId: string) {
    return this.mobileService.getCoverLetter(userId, coverLetterId);
  }

  @Get("cover-letters/:id/pdf")
  @ApiOperation({
    summary: "Get cover letter PDF URL",
    description: "Generates and returns a URL to download the cover letter as PDF.",
  })
  @ApiParam({ name: "id", description: "Cover letter ID" })
  @ApiResponse({ status: 200, description: "PDF URL generated successfully." })
  @ApiResponse({ status: 404, description: "Cover letter not found." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  getCoverLetterPdf(@User("id") userId: string, @Param("id") coverLetterId: string) {
    return this.mobileService.getCoverLetterPdfUrl(userId, coverLetterId);
  }

  @Post("generate-cover-letter")
  @ApiOperation({
    summary: "Generate tailored cover letter",
    description:
      "Uses AI to generate a cover letter tailored to the provided job description. Rate limited to 20 requests per hour.",
  })
  @ApiResponse({ status: 201, description: "Cover letter generated successfully." })
  @ApiResponse({ status: 400, description: "Bad request - Invalid data or AI key not configured." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @ApiResponse({ status: 429, description: "Too many requests - Rate limit exceeded." })
  @Throttle({ default: { limit: 200, ttl: 3_600_000 } }) // 20 per hour for AI generation
  generateCoverLetter(
    @User() user: UserWithSecrets,
    @Body() data: MobileGenerateCoverLetterDto,
    @GetMobileLink() mobileLink?: MobileLink,
  ) {
    return this.mobileService.generateCoverLetter(user, data, mobileLink?.id);
  }

  // ============================================
  // Autofill Export
  // ============================================

  @Post("autofill-export")
  @ApiOperation({
    summary: "Export autofill data",
    description:
      "Exports user data in a format suitable for form filling. Supports structured or flat formats.",
  })
  @ApiResponse({ status: 200, description: "Autofill data exported successfully." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  exportAutofillData(@User("id") userId: string, @Body() data: AutofillExportDto) {
    return this.mobileService.exportAutofillData(userId, data);
  }

  @Post("intelligent-autofill")
  @ApiOperation({
    summary: "Intelligent form autofill",
    description:
      "Analyzes a job application form HTML and returns AI-powered fill instructions. " +
      "Uses the user's information bank to intelligently map fields and generate answers for custom questions. " +
      "Rate limited to 30 requests per hour.",
  })
  @ApiResponse({ status: 200, description: "Autofill instructions generated successfully." })
  @ApiResponse({ status: 400, description: "Bad request - Invalid data or AI key not configured." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @ApiResponse({ status: 429, description: "Too many requests - Rate limit exceeded." })
  @Throttle({ default: { limit: 300, ttl: 3_600_000 } })
  intelligentAutofill(@User() user: UserWithSecrets, @Body() data: IntelligentAutofillRequestDto) {
    return this.mobileService.intelligentAutofill(user, data);
  }

  @Post("intelligent-questions-autofill")
  @ApiOperation({
    summary: "Question-based intelligent autofill",
    description:
      "Answers specific form questions using AI based on the user's information bank and job context. " +
      "Designed for browser AI agents handling dynamic forms, multi-step flows, and non-standard form elements. " +
      "Unlike intelligent-autofill which requires full HTML, this accepts pre-extracted questions. " +
      "Rate limited to 50 requests per hour.",
  })
  @ApiResponse({ status: 200, description: "Question answers generated successfully." })
  @ApiResponse({ status: 400, description: "Bad request - Invalid data or AI key not configured." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @ApiResponse({ status: 429, description: "Too many requests - Rate limit exceeded." })
  @Throttle({ default: { limit: 500, ttl: 3_600_000 } })
  questionAutofill(@User() user: UserWithSecrets, @Body() data: QuestionAutofillRequestDto) {
    return this.mobileService.questionAutofill(user, data);
  }
}
