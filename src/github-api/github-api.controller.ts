import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { QueryGithubApiDto } from './dto/query-github-api.dto';
import { GithubApiService } from './github-api.service';

@ApiTags('Github API')
@Controller({
  path: 'github-api',
  version: '1',
})
export class GithubApiController {
  constructor(private readonly githubApiService: GithubApiService) {}

  @Get('repos')
  @HttpCode(HttpStatus.OK)
  repos(@Query('owner') owner?: string) {
    return this.githubApiService.listRepositories(owner);
  }

  @Get('commits')
  @HttpCode(HttpStatus.OK)
  commits(@Query() query: QueryGithubApiDto) {
    return this.githubApiService.getCommits(query);
  }

  @Get('lines')
  @HttpCode(HttpStatus.OK)
  lines(@Query() query: QueryGithubApiDto) {
    return this.githubApiService.getLines(query);
  }

  @Get('summary')
  @HttpCode(HttpStatus.OK)
  summary(@Query() query: QueryGithubApiDto) {
    return this.githubApiService.getCommitSummary(query);
  }
}
