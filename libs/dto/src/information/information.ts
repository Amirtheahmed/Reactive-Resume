import { defaultInformation, idSchema, informationSchema } from "@reactive-resume/schema";
import { dateSchema } from "@reactive-resume/utils";
import { createZodDto } from "nestjs-zod/dto";
import { z } from "zod";

import { userSchema } from "../user";

export const informationDtoSchema = z.object({
  id: idSchema,
  data: informationSchema.default(defaultInformation),
  userId: idSchema,
  user: userSchema.optional(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
});

export class InformationDto extends createZodDto(informationDtoSchema) {}
