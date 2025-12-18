// apps/server/src/app.module.ts
import path from "node:path";

import { HttpException, Module } from "@nestjs/common";
import { APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";
import { ServeStaticModule } from "@nestjs/serve-static";
import { ThrottlerModule } from "@nestjs/throttler";
import { RavenInterceptor, RavenModule } from "nest-raven";
import { ZodValidationPipe } from "nestjs-zod";

import { ApiKeyModule } from "@/server/api-key/api-key.module";
import { ChatModule } from "@/server/chat/chat.module";
import { ExtensionModule } from "@/server/extension/extension.module";
import { MobileLinkModule } from "@/server/mobile-link/mobile-link.module";
import { MobileModule } from "@/server/mobile/mobile.module";
import { OpenAIModule } from "@/server/openai/openai.module";

import { AuthModule } from "./auth/auth.module";
import { ConfigModule } from "./config/config.module";
import { ContributorsModule } from "./contributors/contributors.module";
import { CoverLetterModule } from "./cover-letter/cover-letter.module";
import { DatabaseModule } from "./database/database.module";
import { FeatureModule } from "./feature/feature.module";
import { HealthModule } from "./health/health.module";
import { InformationModule } from "./information/information.module";
import { MailModule } from "./mail/mail.module";
import { PrinterModule } from "./printer/printer.module";
import { ResumeModule } from "./resume/resume.module";
import { StorageModule } from "./storage/storage.module";
import { TranslationModule } from "./translation/translation.module";
import { UserModule } from "./user/user.module";

@Module({
  imports: [
    // Core Modules
    ConfigModule,
    DatabaseModule,
    MailModule,
    RavenModule,
    HealthModule,
    OpenAIModule,
    ThrottlerModule.forRoot([
      {
        name: "default",
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute default
      },
    ]),

    // Feature Modules
    AuthModule.register(),
    UserModule,
    ResumeModule,
    CoverLetterModule,
    StorageModule,
    PrinterModule,
    FeatureModule,
    TranslationModule,
    ContributorsModule,
    InformationModule,
    ApiKeyModule,
    ExtensionModule,
    ChatModule,
    MobileLinkModule,
    MobileModule,

    // Static Assets
    ...(process.env.NODE_ENV === "production"
      ? [
        ServeStaticModule.forRoot({
          serveRoot: "/artboard",
          // eslint-disable-next-line unicorn/prefer-module
          rootPath: path.join(__dirname, "..", "artboard"),
        }),
        ServeStaticModule.forRoot({
          renderPath: "/*",
          // eslint-disable-next-line unicorn/prefer-module
          rootPath: path.join(__dirname, "..", "client"),
        }),
      ]
      : []),
  ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    {
      provide: APP_INTERCEPTOR,
      useValue: new RavenInterceptor({
        filters: [
          // Filter all HttpException with status code <= 500
          {
            type: HttpException,
            filter: (exception: HttpException) => exception.getStatus() < 500,
          },
        ],
      }),
    },
  ],
})
export class AppModule {}
