import { Injectable } from '@nestjs/common';
import {
  GithubCommitRecord,
  GithubDataPort,
  GithubPullRequestRecord,
  GithubRepository,
  GithubStatsQuery,
} from '../../ports/github-data.port';
import { GithubClient } from './github.client';
import { GithubMapper } from './github.mapper';

@Injectable()
export class GithubAdapter implements GithubDataPort {
  constructor(private readonly githubClient: GithubClient) {}

  validateToken(): Promise<void> {
    return this.githubClient.validateToken();
  }

  async listRepositories(): Promise<GithubRepository[]> {
    const repositories = await this.githubClient.listRepositories();
    return repositories.map((repository) =>
      GithubMapper.toRepository(repository),
    );
  }

  listCommitRecords(query: GithubStatsQuery): Promise<GithubCommitRecord[]> {
    return this.githubClient.listCommitRecords(query);
  }

  listPullRequestRecords(
    query: GithubStatsQuery,
  ): Promise<GithubPullRequestRecord[]> {
    return this.githubClient.listPullRequestRecords(query);
  }
}
