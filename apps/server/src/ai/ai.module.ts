import { Module } from "@nestjs/common";

import { AIProviderFactory, GeminiProvider, OpenAIProvider } from "./providers";
import {
  AIAutofillService,
  AIChatService,
  AICoverLetterService,
  AIResumeService,
  AIService,
} from "./services";
import { AICacheService } from "./utils";

@Module({
  providers: [
    OpenAIProvider,
    GeminiProvider,
    AIProviderFactory,
    AICacheService,
    AIResumeService,
    AICoverLetterService,
    AIChatService,
    AIAutofillService,
    AIService,
  ],
  exports: [
    AIService,
    AICacheService,
    AIResumeService,
    AICoverLetterService,
    AIChatService,
    AIAutofillService,
  ],
})
export class AIModule {}

export { AIModule as OpenAIModule };
