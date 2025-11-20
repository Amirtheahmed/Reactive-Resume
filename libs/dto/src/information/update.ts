import { informationSchema } from "@reactive-resume/schema";
import { createZodDto } from "nestjs-zod/dto";
import { z } from "zod";

export const updateInformationSchema = z.object({
  data: informationSchema,
});

export class UpdateInformationDto extends createZodDto(updateInformationSchema) {}
