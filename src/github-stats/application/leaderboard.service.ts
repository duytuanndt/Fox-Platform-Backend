import { Injectable } from '@nestjs/common';
import { LeaderboardQueryDto } from '../dto/leaderboard-query.dto';
import { GithubStatsService } from './github-stats.service';

@Injectable()
export class LeaderboardService {
  constructor(private readonly githubStatsService: GithubStatsService) {}

  getLeaderboard(query: LeaderboardQueryDto): Promise<unknown[]> {
    return this.githubStatsService.getLeaderboard(query);
  }
}
