import { Module } from "@nestjs/common";

import { AICacheService } from "./ai-cache.service";
import { OpenAIService } from "./openai.service";

@Module({
  providers: [OpenAIService, AICacheService],
  exports: [OpenAIService, AICacheService],
})
export class OpenAIModule {}
