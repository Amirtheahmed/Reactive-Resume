import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { TranslationService } from "./translation.service";

@ApiTags("Translation")
@Controller("translation")
export class TranslationController {
  constructor(private readonly translationService: TranslationService) {}

  @Get("/languages")
  @ApiOperation({
    summary: "Get Supported Languages",
    description: "Returns a list of supported languages for the application.",
  })
  @ApiResponse({ status: 200, description: "Languages retrieved successfully." })
  async languages() {
    return this.translationService.fetchLanguages();
  }
}
