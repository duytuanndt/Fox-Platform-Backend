import { IsEnum } from 'class-validator';
import { GithubMetric } from '../domain/github-metric';
import { QueryStatsDto } from './query-stats.dto';

enum LeaderboardMetric {
  Commits = 'commits',
  Lines = 'lines',
  Prs = 'prs',
  Streak = 'streak',
}

export class LeaderboardQueryDto extends QueryStatsDto {
  @IsEnum(LeaderboardMetric)
  metric: GithubMetric;
}
