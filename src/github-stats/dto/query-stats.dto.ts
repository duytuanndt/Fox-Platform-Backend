import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

enum PullRequestState {
  All = 'all',
  Open = 'open',
  Closed = 'closed',
  Merged = 'merged',
}

export class QueryStatsDto {
  @IsDateString()
  @Type(() => String)
  from: string;

  @IsDateString()
  @Type(() => String)
  to: string;

  @IsOptional()
  @IsString()
  @Type(() => String)
  dev?: string;

  @IsOptional()
  @IsString()
  @Type(() => String)
  repo?: string;

  @IsOptional()
  @IsEnum(PullRequestState)
  @Type(() => String)
  state?: PullRequestState;
}
