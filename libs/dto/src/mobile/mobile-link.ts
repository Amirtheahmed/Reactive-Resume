// libs/dto/src/mobile/mobile-link.ts
import { createZodDto } from "nestjs-zod/dto";
import { z } from "zod";

// Schema for initiating mobile authorization
export const initiateMobileAuthSchema = z.object({
  state: z.string().min(1),
  redirectUri: z.string().url(),
  deviceId: z.string().optional(),
  deviceName: z.string().optional(),
});

export class InitiateMobileAuthDto extends createZodDto(initiateMobileAuthSchema) {}

// Schema for completing mobile authorization
export const completeMobileAuthSchema = z.object({
  state: z.string().min(1),
  externalId: z.string().min(1), // Firebase UID
  deviceId: z.string().optional(),
  deviceName: z.string().optional(),
  provider: z.string().default("firebase"),
});

export class CompleteMobileAuthDto extends createZodDto(completeMobileAuthSchema) {}

// Schema for token refresh
export const refreshMobileLinkTokenSchema = z.object({
  token: z.string().min(1),
});

export class RefreshMobileLinkTokenDto extends createZodDto(refreshMobileLinkTokenSchema) {}

// Schema for revoking a mobile link
export const revokeMobileLinkSchema = z.object({
  deviceId: z.string().optional(), // If not provided, revokes current device
});

export class RevokeMobileLinkDto extends createZodDto(revokeMobileLinkSchema) {}

// Schema for webhook registration
export const registerWebhookSchema = z.object({
  url: z.string().url(),
  events: z
    .array(z.enum(["resume.generated", "cover_letter.generated", "link.revoked", "token.refreshed"]))
    .min(1),
});

export class RegisterWebhookDto extends createZodDto(registerWebhookSchema) {}

// Response DTOs
export const mobileLinkTokenResponseSchema = z.object({
  token: z.string(),
  expiresAt: z.string().datetime(),
});

export type MobileLinkTokenResponse = z.infer<typeof mobileLinkTokenResponseSchema>;

export const mobileLinkDeviceSchema = z.object({
  id: z.string(),
  deviceId: z.string().nullable(),
  deviceName: z.string().nullable(),
  provider: z.string(),
  lastUsed: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export type MobileLinkDevice = z.infer<typeof mobileLinkDeviceSchema>;

export const mobileLinkStatusSchema = z.object({
  isLinked: z.boolean(),
  devices: z.array(mobileLinkDeviceSchema),
});

export type MobileLinkStatus = z.infer<typeof mobileLinkStatusSchema>;

export const webhookResponseSchema = z.object({
  id: z.string(),
  secret: z.string(), // Only returned on creation
  url: z.string().url(),
  events: z.array(z.string()),
  createdAt: z.string().datetime(),
});

export type WebhookResponse = z.infer<typeof webhookResponseSchema>;

// Authorization page query params
export const mobileAuthQuerySchema = z.object({
  state: z.string().min(1),
  redirect_uri: z.string().url(),
  external_id: z.string().optional(),
  device_id: z.string().optional(),
  device_name: z.string().optional(),
});

export type MobileAuthQuery = z.infer<typeof mobileAuthQuerySchema>;

