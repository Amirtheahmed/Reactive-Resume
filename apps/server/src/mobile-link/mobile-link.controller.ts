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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
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

  @Get("authorize")
  @ApiOperation({
    summary: "Initiate mobile authorization",
    description: "Redirects to the client-side authorization page. Used by mobile apps to start the OAuth-style linking flow.",
  })
  @ApiQuery({ name: "state", required: true, description: "CSRF protection state token" })
  @ApiQuery({ name: "redirect_uri", required: true, description: "Callback URI for the mobile app" })
  @ApiQuery({ name: "device_id", required: false, description: "Optional device identifier" })
  @ApiQuery({ name: "device_name", required: false, description: "Optional user-friendly device name" })
  @ApiResponse({ status: 302, description: "Redirects to authorization page." })
  @ApiResponse({ status: 400, description: "Invalid authorization parameters." })
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

  @Post("authorize")
  @UseGuards(TwoFactorGuard)
  @ApiOperation({
    summary: "Complete mobile authorization",
    description: "Completes the authorization flow after user consent. Creates a mobile link and returns the access token.",
  })
  @ApiResponse({ status: 201, description: "Authorization successful, token returned." })
  @ApiResponse({ status: 400, description: "Bad request or external account already linked." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
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

  @Get("status")
  @UseGuards(TwoFactorGuard)
  @ApiOperation({
    summary: "Get mobile link status",
    description: "Returns whether the user has any linked mobile devices and lists them.",
  })
  @ApiResponse({ status: 200, description: "Status retrieved successfully." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  async getStatus(@User() user: UserEntity) {
    return this.mobileLinkService.getLinkedDevices(user.id);
  }

  @Get("devices")
  @UseGuards(TwoFactorGuard)
  @ApiOperation({
    summary: "List linked devices",
    description: "Returns a list of all mobile devices linked to the user's account.",
  })
  @ApiResponse({ status: 200, description: "Devices retrieved successfully." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  async getDevices(@User() user: UserEntity) {
    return this.mobileLinkService.getLinkedDevices(user.id);
  }

  @Delete("devices/:id")
  @HttpCode(204)
  @UseGuards(TwoFactorGuard)
  @ApiOperation({
    summary: "Unlink a device",
    description: "Revokes access for a specific mobile device.",
  })
  @ApiParam({ name: "id", description: "Mobile link ID to revoke" })
  @ApiResponse({ status: 204, description: "Device unlinked successfully." })
  @ApiResponse({ status: 404, description: "Mobile link not found." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  async unlinkDevice(
    @User() user: UserEntity,
    @Param("id") linkId: string,
  ) {
    await this.mobileLinkService.revokeMobileLink(user.id, linkId);
  }

  @Post("revoke")
  @HttpCode(200)
  @UseGuards(TwoFactorGuard)
  @ApiOperation({
    summary: "Revoke all mobile links",
    description: "Revokes access for all mobile devices linked to the user's account.",
  })
  @ApiResponse({ status: 200, description: "All devices unlinked successfully." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  async revokeAll(@User() user: UserEntity) {
    const count = await this.mobileLinkService.revokeAllMobileLinks(user.id);
    return { message: `Revoked ${count} mobile link(s)` };
  }

  @Post("webhook")
  @UseGuards(MobileTokenGuard)
  @ApiBearerAuth("mobile-token")
  @ApiOperation({
    summary: "Register webhook",
    description: "Registers a webhook URL to receive notifications for async events like resume generation completion.",
  })
  @ApiResponse({ status: 201, description: "Webhook registered successfully." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  async registerWebhook(
    @GetMobileLink() mobileLink: MobileLink,
    @Body() data: RegisterWebhookDto,
  ) {
    if (!mobileLink) {
      throw new BadRequestException("Mobile link not found");
    }

    return this.mobileLinkService.registerWebhook(mobileLink.id, data);
  }

  @Delete("webhook")
  @HttpCode(204)
  @UseGuards(MobileTokenGuard)
  @ApiBearerAuth("mobile-token")
  @ApiOperation({
    summary: "Remove webhook",
    description: "Removes the webhook registration for the current mobile link.",
  })
  @ApiResponse({ status: 204, description: "Webhook removed successfully." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  async removeWebhook(@GetMobileLink() mobileLink: MobileLink) {
    if (!mobileLink) {
      throw new BadRequestException("Mobile link not found");
    }

    await this.mobileLinkService.removeWebhook(mobileLink.id);
  }
}

