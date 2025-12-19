import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { FeatureService } from "./feature.service";

@ApiTags("Feature")
@Controller("feature")
export class FeatureController {
  constructor(private readonly featureService: FeatureService) {}

  @Get("/flags")
  @ApiOperation({
    summary: "Get Feature Flags",
    description: "Returns the status of system-wide feature flags.",
  })
  @ApiResponse({ status: 200, description: "Feature flags retrieved successfully." })
  getFeatureFlags() {
    return this.featureService.getFeatures();
  }
}
