import { Inject, Injectable } from '@nestjs/common';
import { ExportQueryDto } from '../dto/export-query.dto';
import { EXPORT_PORT, ExportPort } from '../ports/export.port';
import { GithubStatsService } from './github-stats.service';

@Injectable()
export class ExportService {
  constructor(
    @Inject(EXPORT_PORT)
    private readonly exportPort: ExportPort,
    private readonly githubStatsService: GithubStatsService,
  ) {}

  async exportCsv(query: ExportQueryDto): Promise<string> {
    const rows =
      query.metric === 'commits'
        ? await this.githubStatsService.getCommits(query)
        : query.metric === 'lines'
          ? await this.githubStatsService.getLines(query)
          : query.metric === 'prs'
            ? await this.githubStatsService.getPullRequests(query)
            : await this.githubStatsService.getLeaderboard(query);

    return this.exportPort.toCsv(rows as Record<string, unknown>[]);
  }
}
