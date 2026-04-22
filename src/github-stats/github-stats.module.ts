import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ExportService } from './application/export.service';
import { GithubStatsService } from './application/github-stats.service';
import { HeatmapService } from './application/heatmap.service';
import { LeaderboardService } from './application/leaderboard.service';
import { GithubStatsController } from './github-stats.controller';
import { CacheModule } from './infrastructure/cache/cache.module';
import { CsvExportAdapter } from './infrastructure/csv/csv-export.adapter';
import { GithubModule } from './infrastructure/github/github.module';
import { EXPORT_PORT } from './ports/export.port';
import { InternalAuthGuard } from './guards/internal-auth.guard';

@Module({
  imports: [ConfigModule, GithubModule, CacheModule],
  controllers: [GithubStatsController],
  providers: [
    GithubStatsService,
    LeaderboardService,
    HeatmapService,
    ExportService,
    InternalAuthGuard,
    CsvExportAdapter,
    {
      provide: EXPORT_PORT,
      useExisting: CsvExportAdapter,
    },
  ],
})
export class GithubStatsModule {}
