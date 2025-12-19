import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { UpdateInformationDto } from "@reactive-resume/dto";
import type { InformationData } from "@reactive-resume/schema";
import { defaultInformation } from "@reactive-resume/schema";
import { PrismaService } from "nestjs-prisma";

/**
 * Deep merge information data with defaults.
 * This ensures all sections exist even if the database has old data without sections.
 */
const mergeWithDefaults = (serverData: Partial<InformationData>): InformationData => {
  return {
    basics: { ...defaultInformation.basics, ...serverData.basics },
    sections: {
      ...defaultInformation.sections,
      ...serverData.sections,
      // Merge each section individually to preserve existing items
      profiles: { ...defaultInformation.sections.profiles, ...serverData.sections?.profiles },
      experience: { ...defaultInformation.sections.experience, ...serverData.sections?.experience },
      education: { ...defaultInformation.sections.education, ...serverData.sections?.education },
      skills: { ...defaultInformation.sections.skills, ...serverData.sections?.skills },
      languages: { ...defaultInformation.sections.languages, ...serverData.sections?.languages },
      certifications: {
        ...defaultInformation.sections.certifications,
        ...serverData.sections?.certifications,
      },
      awards: { ...defaultInformation.sections.awards, ...serverData.sections?.awards },
      projects: { ...defaultInformation.sections.projects, ...serverData.sections?.projects },
      publications: {
        ...defaultInformation.sections.publications,
        ...serverData.sections?.publications,
      },
      volunteer: { ...defaultInformation.sections.volunteer, ...serverData.sections?.volunteer },
      interests: { ...defaultInformation.sections.interests, ...serverData.sections?.interests },
      references: { ...defaultInformation.sections.references, ...serverData.sections?.references },
      summary: { ...defaultInformation.sections.summary, ...serverData.sections?.summary },
    },
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    custom: serverData.custom ?? defaultInformation.custom,
  };
};

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

    // Merge existing data with defaults to ensure all sections exist
    const mergedData = mergeWithDefaults(info.data as unknown as Partial<InformationData>);

    return {
      ...info,
      data: mergedData,
    };
  }

  async update(userId: string, updateInformationDto: UpdateInformationDto) {
    const info = await this.prisma.information.upsert({
      where: { userId },
      create: {
        userId,
        data: updateInformationDto.data as unknown as Prisma.JsonObject,
      },
      update: {
        data: updateInformationDto.data as unknown as Prisma.JsonObject,
      },
    });

    // Merge updated data with defaults to ensure all sections exist in the response
    const mergedData = mergeWithDefaults(info.data as unknown as Partial<InformationData>);

    return {
      ...info,
      data: mergedData,
    };
  }
}
