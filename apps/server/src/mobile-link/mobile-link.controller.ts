// apps/server/src/mobile-link/mobile-link.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  createParamDecorator,
  Delete,
  ExecutionContext,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiTags } from "@nestjs/swagger";
import type { MobileLink } from "@prisma/client";
import { User as UserEntity } from "@prisma/client";
import {
  CompleteMobileAuthDto,
  mobileAuthQuerySchema,
  RegisterWebhookDto,
} from "@reactive-resume/dto";
import type { Response } from "express";

import { TwoFactorGuard } from "@/server/auth/guards/two-factor.guard";
import { Config } from "@/server/config/schema";
import { User } from "@/server/user/decorators/user.decorator";

import { MobileTokenGuard } from "./guards/mobile-token.guard";
import { MobileLinkService } from "./mobile-link.service";

// Custom decorator to get mobile link from request
export const GetMobileLink = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): MobileLink | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.mobileLink;
  },
);

@ApiTags("Mobile Link")
@Controller("auth/mobile")
export class MobileLinkController {
  constructor(
    private readonly mobileLinkService: MobileLinkService,
    private readonly configService: ConfigService<Config>,
  ) {}

  /**
   * GET /api/auth/mobile/authorize
   *
   * Redirects to the client-side authorization page.
   * Query params: state, redirect_uri, device_id (optional), device_name (optional)
   */
  @Get("authorize")
  authorize(
    @Query() query: Record<string, string>,
    @Res() response: Response,
  ) {
    // Validate query params
    const result = mobileAuthQuerySchema.safeParse(query);
    if (!result.success) {
      throw new BadRequestException("Invalid authorization parameters");
    }

    const { state, redirect_uri, device_id, device_name } = result.data;

    // Validate redirect URI
    if (!this.mobileLinkService.isAllowedRedirectUri(redirect_uri)) {
      throw new BadRequestException("Invalid redirect URI");
    }

    // Redirect to client-side authorization page
    const publicUrl = this.configService.getOrThrow("PUBLIC_URL");
    const authorizePageUrl = new URL(`${publicUrl}/auth/mobile-authorize`);
    authorizePageUrl.searchParams.set("state", state);
    authorizePageUrl.searchParams.set("redirect_uri", redirect_uri);
    if (device_id) authorizePageUrl.searchParams.set("device_id", device_id);
    if (device_name) authorizePageUrl.searchParams.set("device_name", device_name);

    response.redirect(authorizePageUrl.toString());
  }

  /**
   * POST /api/auth/mobile/authorize
   *
   * Complete the authorization flow (called by the client after user consent).
   * Creates a mobile link and returns the token.
   */
  @Post("authorize")
  @UseGuards(TwoFactorGuard)
  async completeAuthorization(
    @User() user: UserEntity,
    @Body() data: CompleteMobileAuthDto,
  ) {
    const { token, expiresAt } = await this.mobileLinkService.createMobileLink(
      user.id,
      data,
    );

    return {
      token,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * GET /api/auth/mobile/status
   *
   * Check if the current user has any linked mobile devices.
   */
  @Get("status")
  @UseGuards(TwoFactorGuard)
  async getStatus(@User() user: UserEntity) {
    return this.mobileLinkService.getLinkedDevices(user.id);
  }

  /**
   * GET /api/auth/mobile/devices
   *
   * List all linked devices for the current user.
   */
  @Get("devices")
  @UseGuards(TwoFactorGuard)
  async getDevices(@User() user: UserEntity) {
    return this.mobileLinkService.getLinkedDevices(user.id);
  }

  /**
   * DELETE /api/auth/mobile/devices/:id
   *
   * Unlink a specific device.
   */
  @Delete("devices/:id")
  @HttpCode(204)
  @UseGuards(TwoFactorGuard)
  async unlinkDevice(
    @User() user: UserEntity,
    @Param("id") linkId: string,
  ) {
    await this.mobileLinkService.revokeMobileLink(user.id, linkId);
  }

  /**
   * POST /api/auth/mobile/revoke
   *
   * Revoke all mobile links for the current user.
   */
  @Post("revoke")
  @HttpCode(200)
  @UseGuards(TwoFactorGuard)
  async revokeAll(@User() user: UserEntity) {
    const count = await this.mobileLinkService.revokeAllMobileLinks(user.id);
    return { message: `Revoked ${count} mobile link(s)` };
  }

  /**
   * POST /api/auth/mobile/webhook
   *
   * Register a webhook URL to receive notifications.
   * Requires mobile token authentication.
   */
  @Post("webhook")
  @UseGuards(MobileTokenGuard)
  async registerWebhook(
    @GetMobileLink() mobileLink: MobileLink,
    @Body() data: RegisterWebhookDto,
  ) {
    if (!mobileLink) {
      throw new BadRequestException("Mobile link not found");
    }

    return this.mobileLinkService.registerWebhook(mobileLink.id, data);
  }

  /**
   * DELETE /api/auth/mobile/webhook
   *
   * Remove the webhook for the current mobile link.
   */
  @Delete("webhook")
  @HttpCode(204)
  @UseGuards(MobileTokenGuard)
  async removeWebhook(@GetMobileLink() mobileLink: MobileLink) {
    if (!mobileLink) {
      throw new BadRequestException("Mobile link not found");
    }

    await this.mobileLinkService.removeWebhook(mobileLink.id);
  }
}

