import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  InternalServerErrorException,
  Logger,
  Patch,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { OpenAIConfigDto, UpdateUserDto, UserDto } from "@reactive-resume/dto";
import { ErrorMessage } from "@reactive-resume/utils";
import type { Response } from "express";

import { AuthService } from "../auth/auth.service";
import { TwoFactorGuard } from "../auth/guards/two-factor.guard";
import { User } from "./decorators/user.decorator";
import { UserService } from "./user.service";

@ApiTags("User")
@Controller("user")
export class UserController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  @Get("me")
  @UseGuards(TwoFactorGuard)
  @ApiOperation({
    summary: "Get current user",
    description: "Retrieves the profile information of the currently authenticated user.",
  })
  @ApiResponse({ status: 200, description: "User profile retrieved successfully.", type: UserDto })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  fetch(@User() user: UserDto) {
    return user;
  }

  @Patch("me")
  @UseGuards(TwoFactorGuard)
  @ApiOperation({
    summary: "Update current user",
    description: "Updates the profile information of the currently authenticated user.",
  })
  @ApiResponse({ status: 200, description: "User profile updated successfully." })
  @ApiResponse({ status: 400, description: "Bad request or username already taken." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  async update(@User("email") email: string, @Body() updateUserDto: UpdateUserDto) {
    try {
      // If user is updating their email, send a verification email
      if (updateUserDto.email && updateUserDto.email !== email) {
        await this.userService.updateByEmail(email, {
          emailVerified: false,
          email: updateUserDto.email,
        });

        await this.authService.sendVerificationEmail(updateUserDto.email);

        email = updateUserDto.email;
      }

      return await this.userService.updateByEmail(email, {
        name: updateUserDto.name,
        picture: updateUserDto.picture,
        username: updateUserDto.username,
        locale: updateUserDto.locale,
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
        throw new BadRequestException(ErrorMessage.UserAlreadyExists);
      }

      Logger.error(error);
      throw new InternalServerErrorException(error);
    }
  }

  @Delete("me")
  @UseGuards(TwoFactorGuard)
  @ApiOperation({
    summary: "Delete account",
    description: "Permanently deletes the user's account and all associated data.",
  })
  @ApiResponse({ status: 200, description: "Account deleted successfully." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  async delete(@User("id") id: string, @Res({ passthrough: true }) response: Response) {
    await this.userService.deleteOneById(id);

    response.clearCookie("Authentication");
    response.clearCookie("Refresh");

    response.status(200).send({ message: "Sorry to see you go, goodbye!" });
  }

  @Get("me/ai-settings")
  @UseGuards(TwoFactorGuard)
  @ApiOperation({
    summary: "Get AI settings",
    description: "Retrieves the user's personal AI configuration (e.g., OpenAI API Key).",
  })
  @ApiResponse({ status: 200, description: "AI settings retrieved successfully." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  getAiSettings(@User("id") userId: string) {
    return this.userService.getAiSettings(userId);
  }

  @Patch("me/ai-settings")
  @UseGuards(TwoFactorGuard)
  @ApiOperation({
    summary: "Update AI settings",
    description: "Updates the user's personal AI configuration.",
  })
  @ApiResponse({ status: 200, description: "AI settings updated successfully." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  updateAiSettings(@User("id") userId: string, @Body() openAIConfigDto: OpenAIConfigDto) {
    return this.userService.updateAiSettings(userId, openAIConfigDto);
  }
}
