import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Octokit } from '@octokit/rest';
import { AllConfigType } from '../../../config/config.type';
import {
  GithubCommitRecord,
  GithubPullRequestRecord,
  GithubStatsQuery,
} from '../../ports/github-data.port';

@Injectable()
export class GithubClient {
  private readonly logger = new Logger(GithubClient.name);
  private readonly octokit: Octokit;
  private readonly org: string;
  private readonly configuredRepos: string[];

  constructor(private readonly configService: ConfigService<AllConfigType>) {
    const token = this.configService.get<string>('github.token', {
      infer: true,
    });
    this.org =
      this.configService.get<string>('github.org', { infer: true }) ?? '';
    const githubConfig = this.configService.get<AllConfigType['github']>(
      'github',
      {
        infer: true,
      },
    );
    this.configuredRepos = githubConfig?.repos ?? [];

    this.octokit = new Octokit({
      auth: token,
    });
  }

  async validateToken(): Promise<void> {
    await this.octokit.rest.users.getAuthenticated();
    const rateLimit = await this.octokit.rest.rateLimit.get();
    this.logger.log(
      `GitHub rate limit remaining: ${rateLimit.data.rate.remaining}`,
    );
  }

  async listRepositories() {
    if (!this.org) {
      return [];
    }

    if (this.configuredRepos.length > 0) {
      return this.configuredRepos.map((repo) => ({
        name: repo,
        fullName: `${this.org}/${repo}`,
        private: true,
      }));
    }

    const repositories = await this.octokit.paginate(
      this.octokit.rest.repos.listForOrg,
      {
        org: this.org,
        type: 'all',
        per_page: 100,
      },
    );
    return repositories.map((repository) => ({
      name: repository.name,
      fullName: repository.full_name,
      private: repository.private,
    }));
  }

  async listCommitRecords(
    query: GithubStatsQuery,
  ): Promise<GithubCommitRecord[]> {
    const repositories = await this.resolveRepositories(query.repo);
    const records: GithubCommitRecord[] = [];

    for (const repo of repositories) {
      const commits = await this.octokit.paginate(
        this.octokit.rest.repos.listCommits,
        {
          owner: this.org,
          repo,
          since: query.from,
          until: query.to,
          per_page: 100,
        },
      );

      for (const commit of commits) {
        const commitDetail = await this.octokit.rest.repos.getCommit({
          owner: this.org,
          repo,
          ref: commit.sha,
        });

        records.push({
          repo,
          committedAt: commit.commit.author?.date ?? query.from,
          authorLogin: commit.author?.login,
          authorName: commit.commit.author?.name ?? undefined,
          authorEmail: commit.commit.author?.email ?? undefined,
          additions: commitDetail.data.stats?.additions ?? 0,
          deletions: commitDetail.data.stats?.deletions ?? 0,
        });
      }
    }

    return records;
  }

  async listPullRequestRecords(
    query: GithubStatsQuery,
  ): Promise<GithubPullRequestRecord[]> {
    const repositories = await this.resolveRepositories(query.repo);
    const records: GithubPullRequestRecord[] = [];

    for (const repo of repositories) {
      const pullRequests = await this.octokit.paginate(
        this.octokit.rest.pulls.list,
        {
          owner: this.org,
          repo,
          state: 'all',
          per_page: 100,
        },
      );

      for (const pullRequest of pullRequests) {
        records.push({
          repo,
          authorLogin: pullRequest.user?.login,
          createdAt: pullRequest.created_at,
          closedAt: pullRequest.closed_at ?? undefined,
          mergedAt: pullRequest.merged_at ?? undefined,
        });
      }
    }

    return records;
  }

  private async resolveRepositories(repo?: string): Promise<string[]> {
    if (repo) {
      return [repo];
    }

    const repositories = await this.listRepositories();
    return repositories.map((repository) => repository.name);
  }
}
