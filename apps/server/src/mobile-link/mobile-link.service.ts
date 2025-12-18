// apps/server/src/mobile-link/mobile-link.service.ts
import { randomBytes } from "node:crypto";
import * as crypto from "node:crypto";

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { MobileLink, MobileWebhook, User } from "@prisma/client";
import {
  CompleteMobileAuthDto,
  MobileLinkDevice,
  MobileLinkStatus,
  RegisterWebhookDto,
  WebhookResponse,
} from "@reactive-resume/dto";
import * as bcryptjs from "bcryptjs";
import { PrismaService } from "nestjs-prisma";

import type { Config } from "@/server/config/schema";

// Token expiry: 30 days in seconds
const TOKEN_EXPIRY_SECONDS = 30 * 24 * 60 * 60;
// Token refresh threshold: refresh if less than 7 days remaining
const TOKEN_REFRESH_THRESHOLD_SECONDS = 7 * 24 * 60 * 60;

export type MobileLinkTokenPayload = {
  sub: string; // Mobile link ID
  userId: string;
  type: "mobile_link";
  iat?: number;
  exp?: number;
};

export type ValidateTokenResult = {
  user: User;
  mobileLink: MobileLink;
  newToken: string | null;
};

@Injectable()
export class MobileLinkService {
  private readonly logger = new Logger(MobileLinkService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<Config>,
  ) {}

  /**
   * Generate a secure mobile link token (JWT)
   */
  generateToken(mobileLinkId: string, userId: string): string {
    const payload: MobileLinkTokenPayload = {
      sub: mobileLinkId,
      userId,
      type: "mobile_link",
    };

    const secret = this.configService.getOrThrow<string>("ACCESS_TOKEN_SECRET");

    return this.jwtService.sign(payload, {
      secret,
      expiresIn: TOKEN_EXPIRY_SECONDS,
    });
  }

  /**
   * Validate token and optionally refresh if close to expiry
   * Returns user, mobileLink, and new token if refreshed
   */
  async validateAndRefreshToken(token: string): Promise<ValidateTokenResult | null> {
    try {
      const secret = this.configService.getOrThrow<string>("ACCESS_TOKEN_SECRET");

      const payload = this.jwtService.verify<MobileLinkTokenPayload>(token, { secret });

      if (payload.type !== "mobile_link" as const) {
        return null;
      }

      // Find the mobile link
      const mobileLink = await this.prisma.mobileLink.findUnique({
        where: { id: payload.sub },
        include: { user: true },
      });

      if (!mobileLink || mobileLink.revokedAt) {
        return null;
      }

      // Verify token hash matches
      const isValidHash = await bcryptjs.compare(token, mobileLink.tokenHash);
      if (!isValidHash) {
        return null;
      }

      // Update last used timestamp
      await this.prisma.mobileLink.update({
        where: { id: mobileLink.id },
        data: { lastUsed: new Date() },
      });

      // Check if token should be refreshed (less than 7 days remaining)
      let newToken: string | null = null;
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = (payload.exp ?? 0) - now;

      if (expiresIn < TOKEN_REFRESH_THRESHOLD_SECONDS) {
        newToken = this.generateToken(mobileLink.id, mobileLink.userId);

        // Update token hash in database
        const newTokenHash = await bcryptjs.hash(newToken, 10);
        await this.prisma.mobileLink.update({
          where: { id: mobileLink.id },
          data: { tokenHash: newTokenHash },
        });

        this.logger.log(`Token refreshed for mobile link ${mobileLink.id}`);
      }

      return {
        user: mobileLink.user,
        mobileLink,
        newToken,
      };
    } catch (error) {
      this.logger.debug(`Token validation failed: ${error}`);
      return null;
    }
  }

  /**
   * Create a new mobile link after user authorization
   */
  async createMobileLink(
    userId: string,
    data: CompleteMobileAuthDto,
  ): Promise<{ token: string; expiresAt: Date }> {
    // Check for existing link with same externalId + deviceId + provider
    const existingLink = await this.prisma.mobileLink.findFirst({
      where: {
        externalId: data.externalId,
        deviceId: data.deviceId ?? null,
        provider: data.provider,
        revokedAt: null,
      },
    });

    if (existingLink) {
      // If link exists for same user, refresh the token
      if (existingLink.userId === userId) {
        const token = this.generateToken(existingLink.id, userId);
        const tokenHash = await bcryptjs.hash(token, 10);

        await this.prisma.mobileLink.update({
          where: { id: existingLink.id },
          data: {
            tokenHash,
            deviceName: data.deviceName ?? existingLink.deviceName,
            lastUsed: new Date(),
          },
        });

        const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_SECONDS * 1000);
        return { token, expiresAt };
      }

      // If link exists for different user, throw error
      throw new BadRequestException(
        "This external account is already linked to another Reactive Resume account",
      );
    }

    // Create new mobile link
    const mobileLink = await this.prisma.mobileLink.create({
      data: {
        userId,
        externalId: data.externalId,
        deviceId: data.deviceId,
        deviceName: data.deviceName,
        provider: data.provider,
        tokenHash: "", // Will be updated below
      },
    });

    // Generate token and update hash
    const token = this.generateToken(mobileLink.id, userId);
    const tokenHash = await bcryptjs.hash(token, 10);

    await this.prisma.mobileLink.update({
      where: { id: mobileLink.id },
      data: { tokenHash },
    });

    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_SECONDS * 1000);

    this.logger.log(
      `Created mobile link ${mobileLink.id} for user ${userId} (external: ${data.externalId})`,
    );

    return { token, expiresAt };
  }

  /**
   * Get all linked devices for a user
   */
  async getLinkedDevices(userId: string): Promise<MobileLinkStatus> {
    const links = await this.prisma.mobileLink.findMany({
      where: {
        userId,
        revokedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });

    const devices: MobileLinkDevice[] = links.map((link) => ({
      id: link.id,
      deviceId: link.deviceId,
      deviceName: link.deviceName,
      provider: link.provider,
      lastUsed: link.lastUsed?.toISOString() ?? null,
      createdAt: link.createdAt.toISOString(),
    }));

    return {
      isLinked: devices.length > 0,
      devices,
    };
  }

  /**
   * Revoke a specific mobile link
   */
  async revokeMobileLink(userId: string, linkId: string): Promise<void> {
    const link = await this.prisma.mobileLink.findFirst({
      where: {
        id: linkId,
        userId,
        revokedAt: null,
      },
    });

    if (!link) {
      throw new NotFoundException("Mobile link not found");
    }

    await this.prisma.mobileLink.update({
      where: { id: linkId },
      data: { revokedAt: new Date() },
    });

    // Trigger webhook if configured
    await this.triggerWebhook(linkId, "link.revoked", {
      deviceId: link.deviceId,
      revokedAt: new Date().toISOString(),
    });

    this.logger.log(`Revoked mobile link ${linkId} for user ${userId}`);
  }

  /**
   * Revoke all mobile links for a user
   */
  async revokeAllMobileLinks(userId: string): Promise<number> {
    const result = await this.prisma.mobileLink.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    this.logger.log(`Revoked ${result.count} mobile links for user ${userId}`);

    return result.count;
  }

  /**
   * Register a webhook for a mobile link
   */
  async registerWebhook(
    mobileLinkId: string,
    data: RegisterWebhookDto,
  ): Promise<WebhookResponse> {
    // Check if webhook already exists
    const existingWebhook = await this.prisma.mobileWebhook.findUnique({
      where: { mobileLinkId },
    });

    // Generate webhook secret
    const secret = randomBytes(32).toString("hex");
    const secretHash = await bcryptjs.hash(secret, 10);

    if (existingWebhook) {
      // Update existing webhook
      const webhook = await this.prisma.mobileWebhook.update({
        where: { mobileLinkId },
        data: {
          url: data.url,
          events: data.events,
          secretHash,
          isActive: true,
        },
      });

      return {
        id: webhook.id,
        secret: `whsec_${secret}`,
        url: webhook.url,
        events: webhook.events,
        createdAt: webhook.createdAt.toISOString(),
      };
    }

    // Create new webhook
    const webhook = await this.prisma.mobileWebhook.create({
      data: {
        mobileLinkId,
        url: data.url,
        events: data.events,
        secretHash,
      },
    });

    this.logger.log(`Registered webhook for mobile link ${mobileLinkId}`);

    return {
      id: webhook.id,
      secret: `whsec_${secret}`,
      url: webhook.url,
      events: webhook.events,
      createdAt: webhook.createdAt.toISOString(),
    };
  }

  /**
   * Remove webhook for a mobile link
   */
  async removeWebhook(mobileLinkId: string): Promise<void> {
    await this.prisma.mobileWebhook.deleteMany({
      where: { mobileLinkId },
    });

    this.logger.log(`Removed webhook for mobile link ${mobileLinkId}`);
  }

  /**
   * Trigger a webhook event
   */
  async triggerWebhook(
    mobileLinkId: string,
    event: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const webhook = await this.prisma.mobileWebhook.findFirst({
      where: {
        mobileLinkId,
        isActive: true,
        events: { has: event },
      },
    });

    if (!webhook) {
      return;
    }

    const payload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    const payloadString = JSON.stringify(payload);

    // Generate signature
    const signature = crypto
      .createHmac("sha256", webhook.secretHash)
      .update(payloadString)
      .digest("hex");

    // Fire and forget - don't block on webhook delivery
    this.deliverWebhook(webhook, payloadString, signature, event).catch((error: unknown) => {
      this.logger.error(`Webhook delivery failed for ${webhook.id}: ${error}`);
    });
  }

  /**
   * Deliver webhook with retry logic
   */
  private async deliverWebhook(
    webhook: MobileWebhook,
    payload: string,
    signature: string,
    event: string,
    attempt = 1,
  ): Promise<void> {
    const maxAttempts = 3;
    const deliveryId = `del_${randomBytes(8).toString("hex")}`;

    try {
      const response = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": `sha256=${signature}`,
          "X-Webhook-Event": event,
          "X-Webhook-Delivery-Id": deliveryId,
        },
        body: payload,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      this.logger.log(`Webhook delivered successfully: ${deliveryId}`);
    } catch (error) {
      this.logger.warn(
        `Webhook delivery attempt ${attempt}/${maxAttempts} failed: ${error}`,
      );

      if (attempt < maxAttempts) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.deliverWebhook(webhook, payload, signature, event, attempt + 1);
      }

      this.logger.error(`Webhook delivery failed after ${maxAttempts} attempts`);
    }
  }

  /**
   * Get mobile link by ID (for internal use)
   */
  getMobileLinkById(id: string): Promise<MobileLink | null> {
    return this.prisma.mobileLink.findUnique({
      where: { id },
    });
  }

  /**
   * Validate allowed redirect URIs
   */
  isAllowedRedirectUri(uri: string): boolean {
    const allowedUris = this.configService.get("MOBILE_ALLOWED_REDIRECT_URIS" as keyof Config) as string | undefined;

    if (!allowedUris) {
      // In development, allow any redirect URI
      if (this.configService.get("NODE_ENV") === "development") {
        return true;
      }
      return false;
    }

    const allowedList = allowedUris.split(",").map((u) => u.trim());
    return allowedList.some((allowed) => {
      // Support wildcard matching for scheme://host
      if (allowed.endsWith("*")) {
        return uri.startsWith(allowed.slice(0, -1));
      }
      return uri === allowed;
    });
  }
}

