import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { User as UserEntity } from "@prisma/client";
import { ChatRequestDto } from "@reactive-resume/dto";

import { User } from "@/server/user/decorators/user.decorator";

import { TwoFactorGuard } from "../auth/guards/two-factor.guard";
import { ChatService } from "./chat.service";

@ApiTags("Chat")
@Controller("chat")
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  @UseGuards(TwoFactorGuard)
  findAll(@User() user: UserEntity) {
    return this.chatService.findAll(user.id);
  }

  @Get(":id")
  @UseGuards(TwoFactorGuard)
  findOne(@User() user: UserEntity, @Param("id") id: string) {
    return this.chatService.findOne(id, user.id);
  }

  @Delete(":id")
  @UseGuards(TwoFactorGuard)
  remove(@User() user: UserEntity, @Param("id") id: string) {
    return this.chatService.remove(id, user.id);
  }

  @Post()
  @UseGuards(TwoFactorGuard)
  async chat(@User() user: UserEntity, @Body() chatRequestDto: ChatRequestDto) {
    return this.chatService.getAnswer(user.id, chatRequestDto);
  }
}
