// apps/server/src/mobile-link/mobile-link.module.ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";

import { MobileLinkController } from "./mobile-link.controller";
import { MobileLinkService } from "./mobile-link.service";

@Module({
  imports: [ConfigModule, JwtModule],
  controllers: [MobileLinkController],
  providers: [MobileLinkService],
  exports: [MobileLinkService],
})
export class MobileLinkModule {}

