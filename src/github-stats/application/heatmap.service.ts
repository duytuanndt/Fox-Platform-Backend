import { Injectable } from '@nestjs/common';
import { HeatmapQueryDto } from '../dto/heatmap-query.dto';
import { GithubStatsService } from './github-stats.service';

@Injectable()
export class HeatmapService {
  constructor(private readonly githubStatsService: GithubStatsService) {}

  getHeatmap(query: HeatmapQueryDto): Promise<unknown[]> {
    return this.githubStatsService.getHeatmap(query);
  }
}
