import {
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ExportService } from './application/export.service';
import { GithubStatsService } from './application/github-stats.service';
import { HeatmapService } from './application/heatmap.service';
import { LeaderboardService } from './application/leaderboard.service';
import { ExportQueryDto } from './dto/export-query.dto';
import { HeatmapQueryDto } from './dto/heatmap-query.dto';
import { LeaderboardQueryDto } from './dto/leaderboard-query.dto';
import { QueryStatsDto } from './dto/query-stats.dto';

@ApiTags('Github Stats')
@Controller({
  path: 'github-stats',
  version: '1',
})
export class GithubStatsController {
  constructor(
    private readonly githubStatsService: GithubStatsService,
    private readonly leaderboardService: LeaderboardService,
    private readonly heatmapService: HeatmapService,
    private readonly exportService: ExportService,
  ) {}

  @Get('repos')
  @ApiOperation({ summary: 'List repositories in configured GitHub scope' })
  @HttpCode(HttpStatus.OK)
  repos() {
    return this.githubStatsService.listRepositories();
  }

  @Get('commits')
  @ApiOperation({ summary: 'Get commit counts grouped by developer and repo' })
  @ApiQuery({
    name: 'from',
    required: true,
    type: String,
    example: '2026-04-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'to',
    required: true,
    type: String,
    example: '2026-04-30T23:59:59Z',
  })
  @ApiQuery({ name: 'dev', required: false, type: String, example: 'vu-phan' })
  @ApiQuery({
    name: 'repo',
    required: false,
    type: String,
    example: 'converter-pdf-backend',
  })
  @HttpCode(HttpStatus.OK)
  commits(@Query() query: QueryStatsDto) {
    return this.githubStatsService.getCommits(query);
  }

  @Get('lines')
  @ApiOperation({ summary: 'Get line changes grouped by developer and repo' })
  @ApiQuery({
    name: 'from',
    required: true,
    type: String,
    example: '2026-04-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'to',
    required: true,
    type: String,
    example: '2026-04-30T23:59:59Z',
  })
  @ApiQuery({ name: 'dev', required: false, type: String, example: 'vu-phan' })
  @ApiQuery({
    name: 'repo',
    required: false,
    type: String,
    example: 'converter-pdf-backend',
  })
  @HttpCode(HttpStatus.OK)
  lines(@Query() query: QueryStatsDto) {
    return this.githubStatsService.getLines(query);
  }

  @Get('prs')
  @ApiOperation({ summary: 'Get pull request metrics by developer and repo' })
  @ApiQuery({
    name: 'from',
    required: true,
    type: String,
    example: '2026-04-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'to',
    required: true,
    type: String,
    example: '2026-04-30T23:59:59Z',
  })
  @ApiQuery({ name: 'dev', required: false, type: String, example: 'vu-phan' })
  @ApiQuery({
    name: 'repo',
    required: false,
    type: String,
    example: 'converter-pdf-backend',
  })
  @ApiQuery({
    name: 'state',
    required: false,
    enum: ['all', 'open', 'closed', 'merged'],
    example: 'all',
  })
  @HttpCode(HttpStatus.OK)
  prs(@Query() query: QueryStatsDto) {
    return this.githubStatsService.getPullRequests(query);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get team summary metrics for a date range' })
  @ApiQuery({
    name: 'from',
    required: true,
    type: String,
    example: '2026-04-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'to',
    required: true,
    type: String,
    example: '2026-04-30T23:59:59Z',
  })
  @ApiQuery({ name: 'dev', required: false, type: String, example: 'vu-phan' })
  @ApiQuery({
    name: 'repo',
    required: false,
    type: String,
    example: 'converter-pdf-backend',
  })
  @HttpCode(HttpStatus.OK)
  summary(@Query() query: QueryStatsDto) {
    return this.githubStatsService.getSummary(query);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get ranked developers by selected metric' })
  @ApiQuery({
    name: 'from',
    required: true,
    type: String,
    example: '2026-04-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'to',
    required: true,
    type: String,
    example: '2026-04-30T23:59:59Z',
  })
  @ApiQuery({ name: 'dev', required: false, type: String, example: 'vu-phan' })
  @ApiQuery({
    name: 'repo',
    required: false,
    type: String,
    example: 'converter-pdf-backend',
  })
  @ApiQuery({
    name: 'metric',
    required: true,
    enum: ['commits', 'lines', 'prs', 'streak'],
    example: 'commits',
  })
  @HttpCode(HttpStatus.OK)
  leaderboard(@Query() query: LeaderboardQueryDto) {
    return this.leaderboardService.getLeaderboard(query);
  }

  @Get('heatmap')
  @ApiOperation({ summary: 'Get contribution heatmap data by day' })
  @ApiQuery({
    name: 'from',
    required: true,
    type: String,
    example: '2026-04-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'to',
    required: true,
    type: String,
    example: '2026-04-30T23:59:59Z',
  })
  @ApiQuery({ name: 'dev', required: false, type: String, example: 'vu-phan' })
  @ApiQuery({
    name: 'repo',
    required: false,
    type: String,
    example: 'converter-pdf-backend',
  })
  @HttpCode(HttpStatus.OK)
  heatmap(@Query() query: HeatmapQueryDto) {
    return this.heatmapService.getHeatmap(query);
  }

  @Get('export.csv')
  @ApiOperation({ summary: 'Export metrics as CSV' })
  @ApiQuery({
    name: 'from',
    required: true,
    type: String,
    example: '2026-04-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'to',
    required: true,
    type: String,
    example: '2026-04-30T23:59:59Z',
  })
  @ApiQuery({ name: 'dev', required: false, type: String, example: 'vu-phan' })
  @ApiQuery({
    name: 'repo',
    required: false,
    type: String,
    example: 'converter-pdf-backend',
  })
  @ApiQuery({
    name: 'metric',
    required: true,
    enum: ['commits', 'lines', 'prs', 'streak'],
    example: 'commits',
  })
  @Header('Content-Type', 'text/csv')
  @HttpCode(HttpStatus.OK)
  exportCsv(@Query() query: ExportQueryDto) {
    return this.exportService.exportCsv(query);
  }
}
