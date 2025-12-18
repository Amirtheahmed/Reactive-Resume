// libs/schema/src/information/index.ts

import { z } from "zod";

import { basicsSchema, defaultBasics } from "../basics";
import { defaultSections, sectionsSchema } from "../sections";
import { idSchema } from "../shared";

/**
 * @deprecated Custom sections are deprecated. Use structured sections instead.
 * This schema is kept for backward compatibility with existing user data.
 * New data should be stored in the appropriate sections (experience, education, etc.)
 */
export const customInformationSchema = z.object({
  id: idSchema,
  name: z.string(),
  content: z.string().default(""),
});

export const informationSchema = z.object({
  basics: basicsSchema,
  sections: sectionsSchema,
  /**
   * @deprecated Use structured sections instead.
   * Legacy custom sections for backward compatibility only.
   */
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  custom: z.array(customInformationSchema).default([]),
});

export type InformationData = z.infer<typeof informationSchema>;
/**
 * @deprecated Use structured section types instead.
 */
// eslint-disable-next-line @typescript-eslint/no-deprecated
export type CustomInformation = z.infer<typeof customInformationSchema>;

export const defaultInformation: InformationData = {
  basics: defaultBasics,
  sections: defaultSections,
  /**
   * @deprecated Legacy custom sections. Use structured sections (experience, education, etc.) instead.
   * Kept for backward compatibility with existing user data.
   */
  custom: [],
};
