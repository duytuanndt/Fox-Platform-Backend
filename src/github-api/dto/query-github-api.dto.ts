import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

enum TimeBucket {
  Day = 'day',
  Week = 'week',
  Month = 'month',
}

export class QueryGithubApiDto {
  @ApiPropertyOptional({
    description:
      'GitHub organization/owner. Fallback to GITHUB_ORG when omitted.',
    example: 'Foxcode-Studio-Server',
  })
  @IsOptional()
  @IsString()
  @Type(() => String)
  owner?: string;

  @ApiProperty({
    description: 'Start datetime (ISO 8601).',
    example: '2026-04-01T00:00:00Z',
  })
  @IsDateString()
  @Type(() => String)
  from: string;

  @ApiProperty({
    description: 'End datetime (ISO 8601).',
    example: '2026-04-30T23:59:59Z',
  })
  @IsDateString()
  @Type(() => String)
  to: string;

  @ApiPropertyOptional({
    description: 'Filter by developer GitHub username or email.',
    example: 'vu-phan',
  })
  @IsOptional()
  @IsString()
  @Type(() => String)
  dev?: string;

  @ApiPropertyOptional({
    description: 'Single repository name filter.',
    example: 'converter-pdf-backend',
  })
  @IsOptional()
  @IsString()
  @Type(() => String)
  repo?: string;

  @ApiPropertyOptional({
    description: 'Comma-separated repositories. Example: repo-a,repo-b',
    example: 'converter-pdf-backend,model-detect-backend',
  })
  @IsOptional()
  @IsString()
  @Type(() => String)
  repos?: string;

  @ApiPropertyOptional({
    description: 'Time bucket for aggregation.',
    enum: TimeBucket,
    example: TimeBucket.Day,
  })
  @IsOptional()
  @IsEnum(TimeBucket)
  @Type(() => String)
  bucket?: TimeBucket;

  @ApiPropertyOptional({
    description: 'Page size for GitHub requests (1-100).',
    minimum: 1,
    maximum: 100,
    example: 100,
    default: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  perPage?: number;
}
