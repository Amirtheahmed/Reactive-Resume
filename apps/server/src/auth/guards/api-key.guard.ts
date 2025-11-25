import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Request } from "express";

import { ApiKeyService } from "@/server/api-key/api-key.service";

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers["x-api-key"];

    if (!header || Array.isArray(header)) {
      throw new UnauthorizedException("Missing or invalid API Key");
    }

    const user = await this.apiKeyService.validate(header);

    if (!user) {
      throw new UnauthorizedException("Invalid API Key");
    }

    request.user = user;
    return true;
  }
}
