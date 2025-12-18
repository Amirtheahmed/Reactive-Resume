// apps/server/src/mobile/mobile.module.ts
import { Module } from "@nestjs/common";

import { CoverLetterModule } from "@/server/cover-letter/cover-letter.module";
import { InformationModule } from "@/server/information/information.module";
import { MobileLinkModule } from "@/server/mobile-link/mobile-link.module";
import { OpenAIModule } from "@/server/openai/openai.module";
import { PrinterModule } from "@/server/printer/printer.module";
import { ResumeModule } from "@/server/resume/resume.module";

import { MobileController } from "./mobile.controller";
import { MobileService } from "./mobile.service";

@Module({
  imports: [
    InformationModule,
    OpenAIModule,
    ResumeModule,
    PrinterModule,
    CoverLetterModule,
    MobileLinkModule,
  ],
  controllers: [MobileController],
  providers: [MobileService],
  exports: [MobileService],
})
export class MobileModule {}

