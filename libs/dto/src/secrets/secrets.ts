import { idSchema } from "@reactive-resume/schema";
import { z } from "zod";

export const secretsSchema = z.object({
  id: idSchema,
  password: z.string().nullable(),
  lastSignedIn: z.date().nullable(),
  verificationToken: z.string().nullable(),
  twoFactorSecret: z.string().nullable(),
  twoFactorBackupCodes: z.array(z.string()).default([]),
  refreshToken: z.string().nullable(),
  resetToken: z.string().nullable(),
  userId: idSchema,

  aiProvider: z.string().nullable().default("openai"),
  aiApiKey: z.string().nullable(),
  aiBaseUrl: z.string().nullable(),
  aiModel: z.string().nullable(),
  aiMaxTokens: z.number().int().nullable(),
  aiAzureApiVersion: z.string().nullable(),
});
