// apps/server/src/mobile/mobile.service.ts
import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import {
  AutofillExportDto,
  AutofillFlatResponse,
  AutofillStructuredResponse,
  IntelligentAutofillRequestDto,
  IntelligentAutofillResponse,
  MobileGenerateCoverLetterDto,
  MobileGenerateResumeDto,
  OpenAIConfigDto,
  QuestionAutofillRequestDto,
  QuestionAutofillResponse,
  ResumeDto,
  UpdateInformationDto,
  UserWithSecrets,
} from "@reactive-resume/dto";
import type { InformationData, ResumeData } from "@reactive-resume/schema";
import { ErrorMessage } from "@reactive-resume/utils";
import slugify from "@sindresorhus/slugify";
import { PrismaService } from "nestjs-prisma";

import { CoverLetterService } from "@/server/cover-letter/cover-letter.service";
import { InformationService } from "@/server/information/information.service";
import { MobileLinkService } from "@/server/mobile-link/mobile-link.service";
import { OpenAIService } from "@/server/openai/openai.service";
import { PrinterService } from "@/server/printer/printer.service";
import { ResumeService } from "@/server/resume/resume.service";

@Injectable()
export class MobileService {
  private readonly logger = new Logger(MobileService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly informationService: InformationService,
    private readonly openaiService: OpenAIService,
    private readonly resumeService: ResumeService,
    private readonly printerService: PrinterService,
    private readonly coverLetterService: CoverLetterService,
    private readonly mobileLinkService: MobileLinkService,
  ) {}

  /**
   * Get user profile
   */
  async getUserProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        picture: true,
        locale: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  /**
   * Get user's information bank
   */
  async getInformation(userId: string) {
    return this.informationService.findAll(userId);
  }

  /**
   * Update user's information bank
   */
  async updateInformation(userId: string, data: UpdateInformationDto) {
    return this.informationService.update(userId, data);
  }

  /**
   * List all resumes for a user
   */
  async listResumes(userId: string) {
    const resumes = await this.resumeService.findAll(userId);
    return resumes.map((resume) => ({
      id: resume.id,
      title: resume.title,
      slug: resume.slug,
      visibility: resume.visibility,
      createdAt: resume.createdAt,
      updatedAt: resume.updatedAt,
    }));
  }

  /**
   * Get a specific resume
   */
  async getResume(userId: string, resumeId: string) {
    return this.resumeService.findOne(resumeId, userId);
  }

  /**
   * Get resume PDF URL
   */
  async getResumePdfUrl(userId: string, resumeId: string) {
    const resume = await this.resumeService.findOne(resumeId, userId);
    const resumeDto: ResumeDto = {
      ...resume,
      data: resume.data as ResumeData,
      createdAt: resume.createdAt,
      updatedAt: resume.updatedAt,
    };
    const pdfUrl = await this.printerService.printResume(resumeDto);
    return { pdfUrl };
  }

  /**
   * Generate a tailored resume
   */
  async generateResume(
    user: UserWithSecrets,
    data: MobileGenerateResumeDto,
    mobileLinkId?: string,
  ) {
    try {
      const information = await this.informationService.findAll(user.id);

      const baseTitle = `${data.jobTitle} @ ${data.companyName ?? "Company"}`;
      const baseSlug = slugify(baseTitle);

      const { title, slug } = await this.ensureUniqueTitleAndSlug(
        user.id,
        baseTitle,
        baseSlug,
        "resume",
      );

      // Pull AI config from the user's secrets
      const userAiConfig = user.secrets;
      if (!userAiConfig?.aiApiKey) {
        throw new BadRequestException(
          "AI API Key is not configured in your Reactive Resume account. Please add it in Settings -> AI Integration.",
        );
      }

      const openAiConfig: OpenAIConfigDto = {
        provider: (userAiConfig.aiProvider as OpenAIConfigDto["provider"]) ?? "openai",
        apiKey: userAiConfig.aiApiKey,
        baseURL: userAiConfig.aiBaseUrl ?? undefined,
        model: userAiConfig.aiModel ?? undefined,
        maxTokens: userAiConfig.aiMaxTokens ?? undefined,
        isAzure: userAiConfig.aiProvider === "azure",
        azureApiVersion: userAiConfig.aiAzureApiVersion ?? undefined,
      };

      const generatedData = await this.openaiService.generateResume(
        information.data as InformationData,
        data.jobDescription,
        openAiConfig,
      );

      const finalData: ResumeData = {
        ...generatedData,
        basics: {
          ...generatedData.basics,
          name: user.name,
          email: user.email,
          picture: {
            url: user.picture ?? "",
            size: 120,
            aspectRatio: 1,
            borderRadius: 999,
            effects: { hidden: false, border: false, grayscale: false },
          },
        },
        metadata: {
          ...generatedData.metadata,
          template: data.template,
        },
      };

      const resume = await this.prisma.resume.create({
        data: {
          userId: user.id,
          title,
          slug,
          visibility: "private",
          data: finalData,
        },
      });

      const resumeDto: ResumeDto = {
        ...resume,
        data: finalData,
        createdAt: resume.createdAt,
        updatedAt: resume.updatedAt,
      };

      // Generate PDF and preview based on output format
      let pdfUrl: string | undefined;
      let previewUrl: string | undefined;

      if (data.outputFormat === "pdf" || data.outputFormat === "both") {
        [pdfUrl, previewUrl] = await Promise.all([
          this.printerService.printResume(resumeDto),
          this.printerService.printPreview(resumeDto),
        ]);
      }

      // Trigger webhook if configured
      if (mobileLinkId) {
        await this.mobileLinkService.triggerWebhook(mobileLinkId, "resume.generated", {
          resumeId: resume.id,
          title: resume.title,
          pdfUrl,
          previewUrl,
        });
      }

      const result: Record<string, unknown> = {
        id: resume.id,
        title: resume.title,
      };

      if (pdfUrl) result.pdfUrl = pdfUrl;
      if (previewUrl) result.previewUrl = previewUrl;
      if (data.outputFormat === "json" || data.outputFormat === "both") {
        result.data = finalData;
      }

      return result;
    } catch (error) {
      this.logger.error(error);
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(ErrorMessage.SomethingWentWrong);
    }
  }

  /**
   * List all cover letters for a user
   */
  async listCoverLetters(userId: string) {
    const coverLetters = await this.coverLetterService.findAll(userId);
    return coverLetters.map((cl) => ({
      id: cl.id,
      title: cl.title,
      slug: cl.slug,
      createdAt: cl.createdAt,
      updatedAt: cl.updatedAt,
    }));
  }

  /**
   * Get a specific cover letter
   */
  async getCoverLetter(userId: string, coverLetterId: string) {
    return this.coverLetterService.findOne(coverLetterId, userId);
  }

  /**
   * Get cover letter PDF URL
   */
  async getCoverLetterPdfUrl(userId: string, coverLetterId: string) {
    const coverLetter = await this.coverLetterService.findOne(coverLetterId, userId);
    const pdfUrl = await this.printerService.printCoverLetter(coverLetter);
    return { pdfUrl };
  }

  /**
   * Generate a tailored cover letter
   */
  async generateCoverLetter(
    user: UserWithSecrets,
    data: MobileGenerateCoverLetterDto,
    mobileLinkId?: string,
  ) {
    try {
      const information = await this.informationService.findAll(user.id);

      const baseTitle = `${data.jobTitle} @ ${data.companyName ?? "Company"}`;
      const baseSlug = slugify(baseTitle);

      const { title, slug } = await this.ensureUniqueTitleAndSlug(
        user.id,
        baseTitle,
        baseSlug,
        "coverLetter",
      );

      const userAiConfig = user.secrets;
      if (!userAiConfig?.aiApiKey) {
        throw new BadRequestException(
          "AI API Key is not configured in your Reactive Resume account. Please add it in Settings -> AI Integration.",
        );
      }

      const openAiConfig: OpenAIConfigDto = {
        provider: (userAiConfig.aiProvider as OpenAIConfigDto["provider"]) ?? "openai",
        apiKey: userAiConfig.aiApiKey,
        baseURL: userAiConfig.aiBaseUrl ?? undefined,
        model: userAiConfig.aiModel ?? undefined,
        maxTokens: userAiConfig.aiMaxTokens ?? undefined,
        isAzure: userAiConfig.aiProvider === "azure",
        azureApiVersion: userAiConfig.aiAzureApiVersion ?? undefined,
      };

      // Generate cover letter content with tone
      // Note: tone is accepted in the DTO but currently not used by OpenAI service
      // Could be used for future prompt customization
      const { content } = await this.openaiService.generateCoverLetter(
        information.data as InformationData,
        data.jobDescription,
        openAiConfig,
      );

      const coverLetter = await this.prisma.coverLetter.create({
        data: {
          userId: user.id,
          title,
          slug,
          content,
        },
      });

      // Generate PDF
      const pdfUrl = await this.printerService.printCoverLetter(coverLetter);

      // Trigger webhook if configured
      if (mobileLinkId) {
        await this.mobileLinkService.triggerWebhook(mobileLinkId, "cover_letter.generated", {
          coverLetterId: coverLetter.id,
          title: coverLetter.title,
          pdfUrl,
        });
      }

      return {
        id: coverLetter.id,
        title: coverLetter.title,
        content: coverLetter.content,
        pdfUrl,
      };
    } catch (error) {
      this.logger.error(error);
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(ErrorMessage.SomethingWentWrong);
    }
  }

  /**
   * Export user data for autofill
   */
  async exportAutofillData(
    userId: string,
    options: AutofillExportDto,
  ): Promise<AutofillStructuredResponse | AutofillFlatResponse> {
    const information = await this.informationService.findAll(userId);
    const data = information.data as InformationData;

    if (options.format === "flat") {
      return this.transformToFlatFormat(data, options.includeFields);
    }

    return this.transformToStructuredFormat(data, options.includeFields);
  }

  /**
   * Transform information data to structured autofill format
   */
  private transformToStructuredFormat(
    data: InformationData,
    includeFields?: string[],
  ): AutofillStructuredResponse {
    const result: AutofillStructuredResponse = {};

    const shouldInclude = (field: string) => !includeFields || includeFields.includes(field);

    if (shouldInclude("basics")) {
      const basics = data.basics;
      const nameParts = basics.name?.split(" ") ?? [];
      result.basics = {
        fullName: basics.name,
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(" "),
        email: basics.email,
        phone: basics.phone,
        url: basics.url?.href,
        location: basics.location
          ? {
              address: basics.location,
              city: undefined, // Would need parsing
              state: undefined,
              postalCode: undefined,
              country: undefined,
            }
          : undefined,
      };

      // Extract social links
      const customFields = basics.customFields ?? [];
      for (const field of customFields) {
        if (field.name.toLowerCase().includes("linkedin")) {
          result.basics.linkedIn = field.value;
        } else if (field.name.toLowerCase().includes("github")) {
          result.basics.github = field.value;
        } else if (field.name.toLowerCase().includes("twitter")) {
          result.basics.twitter = field.value;
        }
      }
    }

    if (shouldInclude("education") && data.sections?.education?.items) {
      result.education = data.sections.education.items.map((edu) => ({
        institution: edu.institution,
        degree: edu.studyType,
        field: edu.area,
        startDate: edu.date,
        endDate: undefined, // Would need parsing
        gpa: edu.score,
        location: undefined,
      }));
    }

    if (shouldInclude("experience") && data.sections?.experience?.items) {
      result.experience = data.sections.experience.items.map((exp) => ({
        company: exp.company,
        position: exp.position,
        startDate: exp.date,
        endDate: undefined,
        location: exp.location,
        summary: exp.summary,
        current: false,
      }));
    }

    if (shouldInclude("skills") && data.sections?.skills?.items) {
      result.skills = data.sections.skills.items.map((skill) => ({
        name: skill.name,
        level: skill.level,
        keywords: skill.keywords,
      }));
    }

    if (shouldInclude("certifications") && data.sections?.certifications?.items) {
      result.certifications = data.sections.certifications.items.map((cert) => ({
        name: cert.name,
        issuer: cert.issuer,
        date: cert.date,
        url: cert.url?.href,
      }));
    }

    if (shouldInclude("languages") && data.sections?.languages?.items) {
      result.languages = data.sections.languages.items.map((lang) => ({
        language: lang.name,
        fluency: lang.description,
      }));
    }

    return result;
  }

  /**
   * Transform information data to flat key-value format
   */
  private transformToFlatFormat(
    data: InformationData,
    includeFields?: string[],
  ): AutofillFlatResponse {
    const result: AutofillFlatResponse = {};
    const shouldInclude = (field: string) => !includeFields || includeFields.includes(field);

    if (shouldInclude("basics")) {
      const basics = data.basics;
      const nameParts = basics.name?.split(" ") ?? [];

      result.fullName = basics.name ?? null;
      result.firstName = nameParts[0] ?? null;
      result.lastName = nameParts.slice(1).join(" ") || null;
      result.email = basics.email ?? null;
      result.phone = basics.phone ?? null;
      result.location = basics.location ?? null;
      result.website = basics.url?.href ?? null;

      const customFields = basics.customFields ?? [];
      for (const field of customFields) {
        result[field.name.toLowerCase().replace(/\s+/g, "_")] = field.value;
      }
    }

    // Add first education entry
    if (shouldInclude("education") && data.sections?.education?.items?.[0]) {
      const edu = data.sections.education.items[0];
      result.education_institution = edu.institution ?? null;
      result.education_degree = edu.studyType ?? null;
      result.education_field = edu.area ?? null;
      result.education_date = edu.date ?? null;
      result.education_gpa = edu.score ?? null;
    }

    // Add first experience entry
    if (shouldInclude("experience") && data.sections?.experience?.items?.[0]) {
      const exp = data.sections.experience.items[0];
      result.experience_company = exp.company ?? null;
      result.experience_position = exp.position ?? null;
      result.experience_location = exp.location ?? null;
      result.experience_date = exp.date ?? null;
    }

    // Add skills as comma-separated string
    if (shouldInclude("skills") && data.sections?.skills?.items) {
      const skillNames = data.sections.skills.items.map((s) => s.name).filter(Boolean);
      result.skills = skillNames.join(", ");
    }

    return result;
  }

  async intelligentAutofill(
    user: UserWithSecrets,
    data: IntelligentAutofillRequestDto,
  ): Promise<IntelligentAutofillResponse> {
    try {
      const information = await this.informationService.findAll(user.id);

      const userAiConfig = user.secrets;
      if (!userAiConfig?.aiApiKey) {
        throw new BadRequestException(
          "AI API Key is not configured in your Reactive Resume account. Please add it in Settings -> AI Integration.",
        );
      }

      const openAiConfig: OpenAIConfigDto = {
        provider: (userAiConfig.aiProvider as OpenAIConfigDto["provider"]) ?? "openai",
        apiKey: userAiConfig.aiApiKey,
        baseURL: userAiConfig.aiBaseUrl ?? undefined,
        model: userAiConfig.aiModel ?? undefined,
        maxTokens: userAiConfig.aiMaxTokens ?? undefined,
        isAzure: userAiConfig.aiProvider === "azure",
        azureApiVersion: userAiConfig.aiAzureApiVersion ?? undefined,
      };

      return this.openaiService.intelligentAutofill(
        information.data as InformationData,
        data.form_html,
        data.form_text,
        data.page_url,
        data.job_context,
        openAiConfig,
      );
    } catch (error) {
      this.logger.error(error);
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(ErrorMessage.SomethingWentWrong);
    }
  }

  async questionAutofill(
    user: UserWithSecrets,
    data: QuestionAutofillRequestDto,
  ): Promise<QuestionAutofillResponse> {
    try {
      const information = await this.informationService.findAll(user.id);

      const userAiConfig = user.secrets;
      if (!userAiConfig?.aiApiKey) {
        throw new BadRequestException(
          "AI API Key is not configured in your Reactive Resume account. Please add it in Settings -> AI Integration.",
        );
      }

      const openAiConfig: OpenAIConfigDto = {
        provider: (userAiConfig.aiProvider as OpenAIConfigDto["provider"]) ?? "openai",
        apiKey: userAiConfig.aiApiKey,
        baseURL: userAiConfig.aiBaseUrl ?? undefined,
        model: userAiConfig.aiModel ?? undefined,
        maxTokens: userAiConfig.aiMaxTokens ?? undefined,
        isAzure: userAiConfig.aiProvider === "azure",
        azureApiVersion: userAiConfig.aiAzureApiVersion ?? undefined,
      };

      return this.openaiService.questionAutofill(
        information.data as InformationData,
        data.questions,
        data.job_context,
        openAiConfig,
        data.page_url,
        data.instructions,
      );
    } catch (error) {
      this.logger.error(error);
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(ErrorMessage.SomethingWentWrong);
    }
  }

  private async ensureUniqueTitleAndSlug(
    userId: string,
    baseTitle: string,
    baseSlug: string,
    type: "resume" | "coverLetter",
  ): Promise<{ title: string; slug: string }> {
    let title = baseTitle;
    let slug = baseSlug;
    let counter = 1;

    // eslint-disable-next-line no-constant-condition,@typescript-eslint/no-unnecessary-condition
    while (true) {
      const existing =
        type === "resume"
          ? await this.prisma.resume.findFirst({
              where: { userId, slug },
            })
          : await this.prisma.coverLetter.findFirst({
              where: { userId, slug },
            });

      if (!existing) break;

      counter++;
      title = `${baseTitle} (${counter})`;
      slug = `${baseSlug}-${counter}`;
    }

    return { title, slug };
  }
}
