// apps/server/src/mobile-link/guards/mobile-token.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Request, Response } from "express";

import { MobileLinkService } from "@/server/mobile-link/mobile-link.service";

// Extend Express Request type to include mobileLink
type MobileRequest = {
  mobileLink?: unknown;
} & Request

@Injectable()
export class MobileTokenGuard implements CanActivate {
  constructor(private readonly mobileLinkService: MobileLinkService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<MobileRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing or invalid authorization header");
    }

    const token = authHeader.slice(7);

    const result = await this.mobileLinkService.validateAndRefreshToken(token);

    if (!result) {
      throw new UnauthorizedException("Invalid or expired mobile token");
    }

    const { user, newToken, mobileLink } = result;

    // Attach user and mobile link to request
    request.user = user;
    request.mobileLink = mobileLink;

    // If token was refreshed, add new token to response header
    if (newToken) {
      response.setHeader("X-Refreshed-Token", newToken);
    }

    return true;
  }
}

