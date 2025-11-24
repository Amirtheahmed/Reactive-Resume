import { Module } from "@nestjs/common";

import { ApiKeyModule } from "@/server/api-key/api-key.module";
import { InformationModule } from "@/server/information/information.module";
import { OpenAIModule } from "@/server/openai/openai.module";
import { PrinterModule } from "@/server/printer/printer.module";
import { ResumeModule } from "@/server/resume/resume.module";

import { ExtensionController } from "./extension.controller";
import { ExtensionService } from "./extension.service";

@Module({
  imports: [ApiKeyModule, InformationModule, OpenAIModule, ResumeModule, PrinterModule],
  controllers: [ExtensionController],
  providers: [ExtensionService],
})
export class ExtensionModule {}
