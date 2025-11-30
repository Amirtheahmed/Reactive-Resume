import { Body, Controller, Post, UseGuards } from "@nestjs/common";
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

  @Post()
  @UseGuards(TwoFactorGuard)
  async chat(@User() user: UserEntity, @Body() chatRequestDto: ChatRequestDto) {
    return this.chatService.getAnswer(user.id, chatRequestDto);
  }
}
