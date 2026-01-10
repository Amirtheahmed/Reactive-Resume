import { Module } from "@nestjs/common";

import { AIModule } from "@/server/ai";

import { AICacheService } from "./ai-cache.service";

export { AICacheService } from "./ai-cache.service";
export { AIService as OpenAIService } from "@/server/ai";

@Module({
  imports: [AIModule],
  providers: [AICacheService],
  exports: [AIModule, AICacheService],
})
export class OpenAIModule {}
