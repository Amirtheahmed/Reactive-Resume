import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
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
  @ApiOperation({
    summary: "Get Information Bank",
    description: "Retrieves the user's complete information bank (professional background data).",
  })
  @ApiResponse({ status: 200, description: "Information bank retrieved successfully." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  findAll(@User() user: UserEntity) {
    return this.informationService.findAll(user.id);
  }

  @Patch()
  @UseGuards(TwoFactorGuard)
  @ApiOperation({
    summary: "Update Information Bank",
    description: "Updates the user's information bank with new data.",
  })
  @ApiResponse({ status: 200, description: "Information bank updated successfully." })
  @ApiResponse({ status: 400, description: "Bad request." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  update(@User() user: UserEntity, @Body() updateInformationDto: UpdateInformationDto) {
    return this.informationService.update(user.id, updateInformationDto);
  }
}
