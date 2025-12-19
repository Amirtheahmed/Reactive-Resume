import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { ContributorsService } from "./contributors.service";

@ApiTags("Contributors")
@Controller("contributors")
export class ContributorsController {
  constructor(private readonly contributorsService: ContributorsService) {}

  @Get("/github")
  @ApiOperation({
    summary: "Get GitHub Contributors",
    description: "Returns a list of contributors from the GitHub repository.",
  })
  @ApiResponse({ status: 200, description: "GitHub contributors retrieved successfully." })
  async githubContributors() {
    return this.contributorsService.fetchGitHubContributors();
  }

  @Get("/crowdin")
  @ApiOperation({
    summary: "Get Crowdin Contributors",
    description: "Returns a list of translation contributors from Crowdin.",
  })
  @ApiResponse({ status: 200, description: "Crowdin contributors retrieved successfully." })
  async crowdinContributors() {
    return this.contributorsService.fetchCrowdinContributors();
  }
}
