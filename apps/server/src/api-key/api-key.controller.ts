import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { User as UserEntity } from "@prisma/client";
import { CreateApiKeyDto } from "@reactive-resume/dto";

import { TwoFactorGuard } from "@/server/auth/guards/two-factor.guard";
import { User } from "@/server/user/decorators/user.decorator";

import { ApiKeyService } from "./api-key.service";

@ApiTags("API Key")
@Controller("api-key")
@UseGuards(TwoFactorGuard)
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post()
  create(@User() user: UserEntity, @Body() createApiKeyDto: CreateApiKeyDto) {
    return this.apiKeyService.create(user.id, createApiKeyDto);
  }

  @Get()
  findAll(@User() user: UserEntity) {
    return this.apiKeyService.findAll(user.id);
  }

  @Delete(":id")
  remove(@User() user: UserEntity, @Param("id") id: string) {
    return this.apiKeyService.remove(user.id, id);
  }
}
