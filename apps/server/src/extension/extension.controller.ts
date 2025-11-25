// apps/server/src/extension/extension.controller.ts
import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { User as UserEntity } from "@prisma/client";
import {
  AutofillMapRequestDto, // Import new DTO
  ExtensionGenerateCoverLetterDto,
  ExtensionGenerateResumeDto,
  UserWithSecrets,
} from "@reactive-resume/dto";

import { ApiKeyGuard } from "@/server/auth/guards/api-key.guard";
import { User } from "@/server/user/decorators/user.decorator";

import { ExtensionService } from "./extension.service";

@ApiTags("Extension")
@Controller("extension")
@UseGuards(ApiKeyGuard)
export class ExtensionController {
  constructor(private readonly extensionService: ExtensionService) {}

  @Get("me")
  getInformation(@User() user: UserEntity) {
    return this.extensionService.getInformation(user.id);
  }

  @Post("generate")
  generate(@User() user: UserWithSecrets, @Body() data: ExtensionGenerateResumeDto) {
    return this.extensionService.generateResume(user, data);
  }

  @Post("generate-cover-letter")
  generateCoverLetter(
    @User() user: UserWithSecrets,
    @Body() data: ExtensionGenerateCoverLetterDto,
  ) {
    return this.extensionService.generateCoverLetter(user, data);
  }

  // Add the new endpoint here
  @Post("autofill-map")
  autofillMap(@User() user: UserWithSecrets, @Body() data: AutofillMapRequestDto) {
    return this.extensionService.createAutofillMap(user, data);
  }
}
