import { z } from "zod";

import { basicsSchema, defaultBasics } from "../basics";
import { defaultSections, sectionsSchema } from "../sections";

export const informationSchema = z.object({
  basics: basicsSchema,
  sections: sectionsSchema,
});

export type InformationData = z.infer<typeof informationSchema>;

export const defaultInformation: InformationData = {
  basics: defaultBasics,
  sections: defaultSections,
};
