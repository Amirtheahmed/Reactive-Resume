// apps/server/src/cover-letter/cover-letter.module.ts
import { Module } from "@nestjs/common";

import { InformationModule } from "@/server/information/information.module";
import { OpenAIModule } from "@/server/openai/openai.module";
import { PrinterModule } from "@/server/printer/printer.module";
import { UserModule } from "@/server/user/user.module";

import { CoverLetterController } from "./cover-letter.controller";
import { CoverLetterService } from "./cover-letter.service";

@Module({
  imports: [InformationModule, OpenAIModule, PrinterModule, UserModule],
  controllers: [CoverLetterController],
  providers: [CoverLetterService],
  exports: [CoverLetterService],
})
export class CoverLetterModule {}
