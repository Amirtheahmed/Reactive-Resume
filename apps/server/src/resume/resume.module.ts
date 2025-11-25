import { Module } from "@nestjs/common";

import { AuthModule } from "@/server/auth/auth.module";
import { InformationModule } from "@/server/information/information.module";
import { OpenAIModule } from "@/server/openai/openai.module";
import { PrinterModule } from "@/server/printer/printer.module";
import { UserModule } from "@/server/user/user.module";

import { StorageModule } from "../storage/storage.module";
import { ResumeController } from "./resume.controller";
import { ResumeService } from "./resume.service";

@Module({
  imports: [AuthModule, PrinterModule, StorageModule, InformationModule, OpenAIModule, UserModule],
  controllers: [ResumeController],
  providers: [ResumeService],
  exports: [ResumeService],
})
export class ResumeModule {}
