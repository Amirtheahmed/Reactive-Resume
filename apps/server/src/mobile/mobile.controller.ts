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
import { ApiTags } from "@nestjs/swagger";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import type { MobileLink } from "@prisma/client";
import {
  AutofillExportDto,
  MobileGenerateCoverLetterDto,
  MobileGenerateResumeDto,
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
@Controller("mobile")
@UseGuards(ThrottlerGuard, MobileTokenGuard)
@UseInterceptors(MobileLoggingInterceptor)
@Throttle({ default: { limit: 60, ttl: 60000 } }) // 60 requests per minute default
export class MobileController {
  constructor(private readonly mobileService: MobileService) {}

  // ============================================
  // User Profile
  // ============================================

  /**
   * GET /api/mobile/me
   * Get authenticated user profile
   */
  @Get("me")
  getProfile(@User("id") userId: string) {
    return this.mobileService.getUserProfile(userId);
  }

  // ============================================
  // Information Bank
  // ============================================

  /**
   * GET /api/mobile/information
   * Get full information bank
   */
  @Get("information")
  getInformation(@User("id") userId: string) {
    return this.mobileService.getInformation(userId);
  }

  /**
   * PATCH /api/mobile/information
   * Update information bank
   */
  @Patch("information")
  updateInformation(@User("id") userId: string, @Body() data: UpdateInformationDto) {
    return this.mobileService.updateInformation(userId, data);
  }

  // ============================================
  // Resumes
  // ============================================

  /**
   * GET /api/mobile/resumes
   * List all user resumes
   */
  @Get("resumes")
  listResumes(@User("id") userId: string) {
    return this.mobileService.listResumes(userId);
  }

  /**
   * GET /api/mobile/resumes/:id
   * Get a specific resume
   */
  @Get("resumes/:id")
  getResume(@User("id") userId: string, @Param("id") resumeId: string) {
    return this.mobileService.getResume(userId, resumeId);
  }

  /**
   * GET /api/mobile/resumes/:id/pdf
   * Get resume PDF URL
   */
  @Get("resumes/:id/pdf")
  getResumePdf(@User("id") userId: string, @Param("id") resumeId: string) {
    return this.mobileService.getResumePdfUrl(userId, resumeId);
  }

  /**
   * POST /api/mobile/generate-resume
   * Generate a tailored resume from job description
   */
  @Post("generate-resume")
  @Throttle({ default: { limit: 10, ttl: 3600000 } }) // 10 per hour for AI generation
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

  /**
   * GET /api/mobile/cover-letters
   * List all cover letters
   */
  @Get("cover-letters")
  listCoverLetters(@User("id") userId: string) {
    return this.mobileService.listCoverLetters(userId);
  }

  /**
   * GET /api/mobile/cover-letters/:id
   * Get a specific cover letter
   */
  @Get("cover-letters/:id")
  getCoverLetter(@User("id") userId: string, @Param("id") coverLetterId: string) {
    return this.mobileService.getCoverLetter(userId, coverLetterId);
  }

  /**
   * GET /api/mobile/cover-letters/:id/pdf
   * Get cover letter PDF URL
   */
  @Get("cover-letters/:id/pdf")
  getCoverLetterPdf(@User("id") userId: string, @Param("id") coverLetterId: string) {
    return this.mobileService.getCoverLetterPdfUrl(userId, coverLetterId);
  }

  /**
   * POST /api/mobile/generate-cover-letter
   * Generate a tailored cover letter
   */
  @Post("generate-cover-letter")
  @Throttle({ default: { limit: 20, ttl: 3600000 } }) // 20 per hour for AI generation
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

  /**
   * POST /api/mobile/autofill-export
   * Export user data formatted for form filling
   */
  @Post("autofill-export")
  exportAutofillData(@User("id") userId: string, @Body() data: AutofillExportDto) {
    return this.mobileService.exportAutofillData(userId, data);
  }
}

