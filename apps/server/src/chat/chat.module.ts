import { Module } from "@nestjs/common";

import { InformationModule } from "@/server/information/information.module";
import { OpenAIModule } from "@/server/openai/openai.module";

import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";

@Module({
  imports: [OpenAIModule, InformationModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
