import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GithubCommitRecord,
  GITHUB_DATA_PORT,
  GithubDataPort,
  GithubPullRequestRecord,
  GithubRepository,
} from '../ports/github-data.port';
import { QueryStatsDto } from '../dto/query-stats.dto';
import { AllConfigType } from '../../config/config.type';

@Injectable()
export class GithubStatsService {
  private readonly logger = new Logger(GithubStatsService.name);

  constructor(
    @Inject(GITHUB_DATA_PORT)
    private readonly githubDataPort: GithubDataPort,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.githubDataPort.validateToken();
      this.logger.log('GitHub token validation succeeded');
    } catch (error) {
      this.logger.error('GitHub token validation failed', error);
    }
  }

  listRepositories(): Promise<GithubRepository[]> {
    return this.githubDataPort.listRepositories();
  }

  async getCommits(query: QueryStatsDto): Promise<unknown[]> {
    const commits = await this.githubDataPort.listCommitRecords(query);
    return this.aggregateCommitLike(commits).map((item) => ({
      developer: item.developer,
      repo: item.repo,
      commits: item.commits,
    }));
  }

  async getLines(query: QueryStatsDto): Promise<unknown[]> {
    const commits = await this.githubDataPort.listCommitRecords(query);
    return this.aggregateCommitLike(commits).map((item) => ({
      developer: item.developer,
      repo: item.repo,
      additions: item.additions,
      deletions: item.deletions,
      net: item.additions - item.deletions,
    }));
  }

  async getPullRequests(query: QueryStatsDto): Promise<unknown[]> {
    const pullRequests =
      await this.githubDataPort.listPullRequestRecords(query);
    const filtered = this.filterPullRequestsByStateAndRange(
      pullRequests,
      query,
    );

    const aggregate = new Map<
      string,
      { opened: number; closed: number; merged: number }
    >();
    for (const pullRequest of filtered) {
      const developer = this.normalizeIdentity({
        login: pullRequest.authorLogin,
      });
      const key = `${developer}::${pullRequest.repo}`;
      const current = aggregate.get(key) ?? { opened: 0, closed: 0, merged: 0 };
      if (this.isDateInRange(pullRequest.createdAt, query.from, query.to)) {
        current.opened += 1;
      }
      if (
        pullRequest.closedAt &&
        this.isDateInRange(pullRequest.closedAt, query.from, query.to)
      ) {
        current.closed += 1;
      }
      if (
        pullRequest.mergedAt &&
        this.isDateInRange(pullRequest.mergedAt, query.from, query.to)
      ) {
        current.merged += 1;
      }
      aggregate.set(key, current);
    }

    return [...aggregate.entries()].map(([key, value]) => {
      const [developer, repo] = key.split('::');
      return { developer, repo, ...value };
    });
  }

  async getSummary(query: QueryStatsDto): Promise<Record<string, unknown>> {
    const [commits, prs] = await Promise.all([
      this.githubDataPort.listCommitRecords(query),
      this.githubDataPort.listPullRequestRecords(query),
    ]);

    const commitAggregate = this.aggregateCommitLike(commits);
    const prAggregate = await this.getPullRequests(query);

    const totals = commitAggregate.reduce(
      (accumulator, item) => ({
        commits: accumulator.commits + item.commits,
        additions: accumulator.additions + item.additions,
        deletions: accumulator.deletions + item.deletions,
      }),
      { commits: 0, additions: 0, deletions: 0 },
    );

    const prTotals = (prAggregate as Array<Record<string, number>>).reduce(
      (accumulator, item) => ({
        opened: accumulator.opened + (item.opened ?? 0),
        merged: accumulator.merged + (item.merged ?? 0),
        closed: accumulator.closed + (item.closed ?? 0),
      }),
      { opened: 0, merged: 0, closed: 0 },
    );

    const byRepo = new Map<
      string,
      {
        commits: number;
        additions: number;
        deletions: number;
      }
    >();
    for (const commit of commitAggregate) {
      const current = byRepo.get(commit.repo) ?? {
        commits: 0,
        additions: 0,
        deletions: 0,
      };
      current.commits += commit.commits;
      current.additions += commit.additions;
      current.deletions += commit.deletions;
      byRepo.set(commit.repo, current);
    }

    return {
      totals: {
        ...totals,
        ...prTotals,
      },
      repos: [...byRepo.entries()].map(([repo, value]) => ({ repo, ...value })),
      developers: commitAggregate,
      caveats: [
        'GitHub activity is a proxy metric and not absolute productivity.',
        'Commit count and line count should be interpreted with caution.',
      ],
      pullRequests: prs.length,
    };
  }

  async getHeatmap(
    query: QueryStatsDto,
  ): Promise<Array<{ date: string; count: number }>> {
    const commits = await this.githubDataPort.listCommitRecords(query);
    const filtered = commits.filter((commit) =>
      this.isCommitAllowed(commit, query.dev),
    );
    const buckets = new Map<string, number>();
    for (const commit of filtered) {
      const date = new Date(commit.committedAt).toISOString().slice(0, 10);
      buckets.set(date, (buckets.get(date) ?? 0) + 1);
    }
    return [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));
  }

  async getLeaderboard(
    query: QueryStatsDto & { metric: 'commits' | 'lines' | 'prs' | 'streak' },
  ): Promise<unknown[]> {
    const [commits, pullRequests] = await Promise.all([
      this.githubDataPort.listCommitRecords(query),
      this.githubDataPort.listPullRequestRecords(query),
    ]);
    const commitAggregate = this.aggregateCommitLike(commits);
    const byDeveloper = new Map<
      string,
      { commits: number; lines: number; prs: number; streak: number }
    >();

    for (const item of commitAggregate) {
      const current = byDeveloper.get(item.developer) ?? {
        commits: 0,
        lines: 0,
        prs: 0,
        streak: 0,
      };
      current.commits += item.commits;
      current.lines += item.additions + item.deletions;
      byDeveloper.set(item.developer, current);
    }

    for (const pullRequest of pullRequests) {
      const developer = this.normalizeIdentity({
        login: pullRequest.authorLogin,
      });
      const current = byDeveloper.get(developer) ?? {
        commits: 0,
        lines: 0,
        prs: 0,
        streak: 0,
      };
      if (this.isDateInRange(pullRequest.createdAt, query.from, query.to)) {
        current.prs += 1;
      }
      byDeveloper.set(developer, current);
    }

    const streakByDev = this.calculateCommitStreaks(commits, query.dev);
    for (const [developer, streak] of streakByDev.entries()) {
      const current = byDeveloper.get(developer) ?? {
        commits: 0,
        lines: 0,
        prs: 0,
        streak: 0,
      };
      current.streak = streak;
      byDeveloper.set(developer, current);
    }

    return [...byDeveloper.entries()]
      .map(([developer, values]) => ({
        developer,
        ...values,
      }))
      .sort((a, b) => b[query.metric] - a[query.metric]);
  }

  private aggregateCommitLike(commits: GithubCommitRecord[]) {
    const byDevRepo = new Map<
      string,
      {
        developer: string;
        repo: string;
        commits: number;
        additions: number;
        deletions: number;
      }
    >();

    for (const commit of commits) {
      if (!this.isCommitAllowed(commit)) {
        continue;
      }
      const developer = this.normalizeIdentity({
        login: commit.authorLogin,
        name: commit.authorName,
        email: commit.authorEmail,
      });
      const key = `${developer}::${commit.repo}`;
      const current = byDevRepo.get(key) ?? {
        developer,
        repo: commit.repo,
        commits: 0,
        additions: 0,
        deletions: 0,
      };
      current.commits += 1;
      current.additions += commit.additions;
      current.deletions += commit.deletions;
      byDevRepo.set(key, current);
    }

    return [...byDevRepo.values()];
  }

  private isCommitAllowed(commit: GithubCommitRecord, dev?: string): boolean {
    const candidate =
      `${commit.authorLogin ?? ''} ${commit.authorName ?? ''}`.toLowerCase();
    const githubConfig = this.configService.get<AllConfigType['github']>(
      'github',
      {
        infer: true,
      },
    );
    const patterns = githubConfig?.botPatterns ?? [];
    if (patterns.some((pattern) => candidate.includes(pattern))) {
      return false;
    }
    if (!dev) {
      return true;
    }
    return (
      this.normalizeIdentity({
        login: commit.authorLogin,
        name: commit.authorName,
        email: commit.authorEmail,
      }).toLowerCase() === dev.toLowerCase()
    );
  }

  private normalizeIdentity(identity: {
    login?: string;
    name?: string;
    email?: string;
  }): string {
    const githubConfig = this.configService.get<AllConfigType['github']>(
      'github',
      {
        infer: true,
      },
    );
    const mapping = githubConfig?.identityMap ?? {};
    const login = identity.login?.toLowerCase();
    if (login && mapping?.[login]) {
      return mapping[login];
    }
    if (identity.login) {
      return identity.login;
    }
    if (identity.email) {
      return identity.email;
    }
    if (identity.name) {
      return identity.name;
    }
    return 'unknown';
  }

  private filterPullRequestsByStateAndRange(
    pullRequests: GithubPullRequestRecord[],
    query: QueryStatsDto,
  ): GithubPullRequestRecord[] {
    return pullRequests.filter((pullRequest) => {
      const includeByDate =
        this.isDateInRange(pullRequest.createdAt, query.from, query.to) ||
        (pullRequest.closedAt &&
          this.isDateInRange(pullRequest.closedAt, query.from, query.to)) ||
        (pullRequest.mergedAt &&
          this.isDateInRange(pullRequest.mergedAt, query.from, query.to));

      if (!includeByDate) {
        return false;
      }

      if (query.state === 'open') {
        return !pullRequest.closedAt;
      }
      if (query.state === 'closed') {
        return Boolean(pullRequest.closedAt);
      }
      if (query.state === 'merged') {
        return Boolean(pullRequest.mergedAt);
      }
      return true;
    });
  }

  private isDateInRange(value: string, from: string, to: string): boolean {
    const target = new Date(value).getTime();
    const start = new Date(from).getTime();
    const end = new Date(to).getTime();
    return target >= start && target <= end;
  }

  private calculateCommitStreaks(
    commits: GithubCommitRecord[],
    dev?: string,
  ): Map<string, number> {
    const byDeveloperDays = new Map<string, Set<string>>();
    for (const commit of commits) {
      if (!this.isCommitAllowed(commit, dev)) {
        continue;
      }
      const developer = this.normalizeIdentity({
        login: commit.authorLogin,
        name: commit.authorName,
        email: commit.authorEmail,
      });
      const day = new Date(commit.committedAt).toISOString().slice(0, 10);
      const days = byDeveloperDays.get(developer) ?? new Set<string>();
      days.add(day);
      byDeveloperDays.set(developer, days);
    }

    const streakMap = new Map<string, number>();
    for (const [developer, days] of byDeveloperDays.entries()) {
      const sortedDays = [...days].sort();
      let maxStreak = 0;
      let currentStreak = 0;
      let previousDay: number | null = null;
      for (const day of sortedDays) {
        const dayValue = new Date(day).getTime();
        if (
          previousDay === null ||
          dayValue - previousDay === 24 * 60 * 60 * 1000
        ) {
          currentStreak += 1;
        } else {
          currentStreak = 1;
        }
        maxStreak = Math.max(maxStreak, currentStreak);
        previousDay = dayValue;
      }
      streakMap.set(developer, maxStreak);
    }
    return streakMap;
  }
}
