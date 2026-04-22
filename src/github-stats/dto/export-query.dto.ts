import { IsEnum } from 'class-validator';
import { GithubMetric } from '../domain/github-metric';
import { QueryStatsDto } from './query-stats.dto';

enum ExportMetric {
  Commits = 'commits',
  Lines = 'lines',
  Prs = 'prs',
  Streak = 'streak',
}

export class ExportQueryDto extends QueryStatsDto {
  @IsEnum(ExportMetric)
  metric: GithubMetric;
}
