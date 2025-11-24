import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { User as UserEntity } from "@prisma/client";
import { ExtensionGenerateResumeDto } from "@reactive-resume/dto";

import { ApiKeyGuard } from "@/server/auth/guards/api-key.guard";
import { User } from "@/server/user/decorators/user.decorator";

import { ExtensionService } from "./extension.service";

@ApiTags("Extension")
@Controller("extension")
@UseGuards(ApiKeyGuard)
export class ExtensionController {
  constructor(private readonly extensionService: ExtensionService) {}

  @Post("generate")
  generate(@User() user: UserEntity, @Body() data: ExtensionGenerateResumeDto) {
    return this.extensionService.generateResume(user.id, data);
  }
}
