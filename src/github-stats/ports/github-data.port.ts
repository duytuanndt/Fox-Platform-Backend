export const GITHUB_DATA_PORT = Symbol('GITHUB_DATA_PORT');

export type GithubRepository = {
  name: string;
  fullName: string;
  private: boolean;
};

export type GithubStatsQuery = {
  from: string;
  to: string;
  repo?: string;
  state?: 'all' | 'open' | 'closed' | 'merged';
};

export type GithubCommitRecord = {
  repo: string;
  committedAt: string;
  authorLogin?: string;
  authorName?: string;
  authorEmail?: string;
  additions: number;
  deletions: number;
};

export type GithubPullRequestRecord = {
  repo: string;
  authorLogin?: string;
  createdAt: string;
  closedAt?: string;
  mergedAt?: string;
};

export interface GithubDataPort {
  validateToken(): Promise<void>;
  listRepositories(): Promise<GithubRepository[]>;
  listCommitRecords(query: GithubStatsQuery): Promise<GithubCommitRecord[]>;
  listPullRequestRecords(
    query: GithubStatsQuery,
  ): Promise<GithubPullRequestRecord[]>;
}
