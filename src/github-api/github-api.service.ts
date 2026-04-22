import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '../config/config.type';
import { QueryGithubApiDto } from './dto/query-github-api.dto';

type GithubListCommitItem = {
  sha: string;
  author: { login?: string } | null;
  commit: {
    author: {
      name?: string;
      email?: string;
      date?: string;
    } | null;
  };
};

type GithubCommitDetail = {
  stats?: {
    additions?: number;
    deletions?: number;
    total?: number;
  };
};

type RepoAggregate = {
  repo: string;
  commits: number;
  additions: number;
  deletions: number;
  net: number;
};

type DevRepoAggregate = {
  developer: string;
  repo: string;
  commits: number;
  additions: number;
  deletions: number;
};

@Injectable()
export class GithubApiService {
  private readonly logger = new Logger(GithubApiService.name);
  private readonly baseUrl = 'https://api.github.com';
  private readonly GITHUB_TOKEN = process.env.GITHUB_TOKEN;

  constructor(private readonly configService: ConfigService<AllConfigType>) {}

  async listRepositories(owner?: string): Promise<
    Array<{
      name: string;
      fullName: string;
      private: boolean;
    }>
  > {
    const resolvedOwner = owner ?? 'Foxcode-Studio-Server';

    const repositories = await this.fetchPaginated<{
      name: string;
      full_name: string;
      private: boolean;
    }>(`/orgs/${resolvedOwner}/repos`, { per_page: '100', type: 'all' });

    return repositories.map((repository) => ({
      name: repository.name,
      fullName: repository.full_name,
      private: repository.private,
    }));
  }

  async getCommitSummary(query: QueryGithubApiDto): Promise<{
    developer: string;
    from: string;
    to: string;
    repos: RepoAggregate[];
    summary: RepoAggregate;
  }> {
    const commits = await this.collectCommitStats(query);
    const developerFilter = query.dev ?? 'all-team';
    const repoGroups = new Map<string, RepoAggregate>();

    for (const commit of commits) {
      const current = repoGroups.get(commit.repo) ?? {
        repo: commit.repo,
        commits: 0,
        additions: 0,
        deletions: 0,
        net: 0,
      };
      current.commits += commit.commits;
      current.additions += commit.additions;
      current.deletions += commit.deletions;
      current.net = current.additions - current.deletions;
      repoGroups.set(commit.repo, current);
    }

    const repos = [...repoGroups.values()];
    const summary = repos.reduce(
      (accumulator, item) => ({
        repo: 'all',
        commits: accumulator.commits + item.commits,
        additions: accumulator.additions + item.additions,
        deletions: accumulator.deletions + item.deletions,
        net: accumulator.net + item.net,
      }),
      { repo: 'all', commits: 0, additions: 0, deletions: 0, net: 0 },
    );

    return {
      developer: developerFilter,
      from: query.from,
      to: query.to,
      repos,
      summary,
    };
  }

  async getCommits(
    query: QueryGithubApiDto,
  ): Promise<Array<{ developer: string; repo: string; commits: number }>> {
    const commits = await this.collectCommitStats(query);
    return commits.map((item) => ({
      developer: item.developer,
      repo: item.repo,
      commits: item.commits,
    }));
  }

  async getLines(query: QueryGithubApiDto): Promise<
    Array<{
      developer: string;
      repo: string;
      additions: number;
      deletions: number;
      net: number;
    }>
  > {
    const commits = await this.collectCommitStats(query);
    return commits.map((item) => ({
      developer: item.developer,
      repo: item.repo,
      additions: item.additions,
      deletions: item.deletions,
      net: item.additions - item.deletions,
    }));
  }

  private async collectCommitStats(
    query: QueryGithubApiDto,
  ): Promise<DevRepoAggregate[]> {
    const owner = this.resolveOwner(query.owner);
    const repositories = await this.resolveRepositories(owner, query);
    const aggregate = new Map<string, DevRepoAggregate>();
    const seenCommits = new Set<string>();

    for (const repo of repositories) {
      const commits = await this.fetchPaginated<GithubListCommitItem>(
        `/repos/${owner}/${repo}/commits`,
        {
          since: query.from,
          until: query.to,
          per_page: String(query.perPage ?? 100),
          ...(query.dev ? { author: query.dev } : {}),
        },
      );

      const commitDetails = await this.runWithConcurrency(
        commits,
        5,
        async (commit) => {
          const dedupeKey = `${repo}:${commit.sha}`;
          if (seenCommits.has(dedupeKey)) {
            return null;
          }
          seenCommits.add(dedupeKey);
          const detail = await this.request<GithubCommitDetail>(
            `/repos/${owner}/${repo}/commits/${commit.sha}`,
          );
          return { commit, detail };
        },
      );

      for (const entry of commitDetails) {
        if (!entry) {
          continue;
        }
        const developer = this.normalizeDeveloper({
          login: entry.commit.author?.login,
          email: entry.commit.commit.author?.email,
          name: entry.commit.commit.author?.name,
        });
        const key = `${developer}:${repo}`;
        const current = aggregate.get(key) ?? {
          developer,
          repo,
          commits: 0,
          additions: 0,
          deletions: 0,
        };
        current.commits += 1;
        current.additions += entry.detail.stats?.additions ?? 0;
        current.deletions += entry.detail.stats?.deletions ?? 0;
        aggregate.set(key, current);
      }
    }

    return [...aggregate.values()];
  }

  private resolveOwner(owner?: string): string {
    const configOwner = this.configService.get<string>('github.org', {
      infer: true,
    });
    return owner ?? configOwner ?? '';
  }

  private async resolveRepositories(
    owner: string,
    query: QueryGithubApiDto,
  ): Promise<string[]> {
    if (query.repo) {
      return [query.repo];
    }
    if (query.repos) {
      return query.repos
        .split(',')
        .map((repo) => repo.trim())
        .filter(Boolean);
    }

    const repositories = await this.listRepositories(owner);
    return repositories.map((repository) => repository.name);
  }

  private normalizeDeveloper(identity: {
    login?: string;
    email?: string;
    name?: string;
  }): string {
    const githubConfig = this.configService.get<AllConfigType['github']>(
      'github',
      {
        infer: true,
      },
    );
    const mapping = githubConfig?.identityMap ?? {};
    const login = identity.login?.toLowerCase();
    if (login && mapping[login]) {
      return mapping[login];
    }
    return identity.login ?? identity.email ?? identity.name ?? 'unknown';
  }

  private async fetchPaginated<T>(
    path: string,
    query: Record<string, string>,
  ): Promise<T[]> {
    const allItems: T[] = [];
    let page = 1;
    const perPage = Number(query.per_page ?? 100);

    while (true) {
      const pageItems = await this.request<T[]>(path, {
        ...query,
        page: String(page),
        per_page: String(perPage),
      });
      allItems.push(...pageItems);

      if (pageItems.length < perPage) {
        break;
      }
      page += 1;
    }

    return allItems;
  }

  private async request<T>(
    path: string,
    query?: Record<string, string>,
  ): Promise<T> {
    const endpoint = new URL(`${this.baseUrl}${path}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        endpoint.searchParams.set(key, value);
      }
    }

    const response = await fetch(endpoint.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2026-03-10',
        ...(this.GITHUB_TOKEN
          ? { Authorization: `Bearer ${this.GITHUB_TOKEN}` }
          : {}),
      },
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(
        `GitHub API request failed ${response.status} for ${endpoint.pathname}`,
      );
      throw new Error(
        `GitHub API request failed: ${response.status} ${response.statusText} - ${body}`,
      );
    }

    return (await response.json()) as T;
  }

  private async runWithConcurrency<T, R>(
    items: T[],
    concurrency: number,
    worker: (item: T) => Promise<R>,
  ): Promise<R[]> {
    const results: R[] = [];
    let index = 0;

    const executeWorker = async () => {
      while (index < items.length) {
        const currentIndex = index;
        index += 1;
        results[currentIndex] = await worker(items[currentIndex]);
      }
    };

    const workers = Array.from(
      { length: Math.min(concurrency, items.length) },
      () => executeWorker(),
    );
    await Promise.all(workers);
    return results;
  }
}
