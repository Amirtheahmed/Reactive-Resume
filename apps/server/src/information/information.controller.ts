import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { User as UserEntity } from "@prisma/client";
import { UpdateInformationDto } from "@reactive-resume/dto";

import { User } from "@/server/user/decorators/user.decorator";

import { TwoFactorGuard } from "../auth/guards/two-factor.guard";
import { InformationService } from "./information.service";

@ApiTags("Information")
@Controller("information")
export class InformationController {
  constructor(private readonly informationService: InformationService) {}

  @Get()
  @UseGuards(TwoFactorGuard)
  findAll(@User() user: UserEntity) {
    return this.informationService.findAll(user.id);
  }

  @Patch()
  @UseGuards(TwoFactorGuard)
  update(@User() user: UserEntity, @Body() updateInformationDto: UpdateInformationDto) {
    return this.informationService.update(user.id, updateInformationDto);
  }
}
