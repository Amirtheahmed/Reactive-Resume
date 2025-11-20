// libs/schema/src/information/index.ts

import { z } from "zod";

import { basicsSchema, defaultBasics } from "../basics";
import { idSchema } from "../shared";
import { defaultSections, sectionsSchema } from "../sections";

export const customInformationSchema = z.object({
  id: idSchema,
  name: z.string(),
  content: z.string().default(""),
});

export const informationSchema = z.object({
  basics: basicsSchema,
  sections: sectionsSchema,
  custom: z.array(customInformationSchema).default([]),
});

export type InformationData = z.infer<typeof informationSchema>;
export type CustomInformation = z.infer<typeof customInformationSchema>;

export const defaultInformation: InformationData = {
  basics: defaultBasics,
  sections: defaultSections,
  custom: [],
};
