export type RepoStat = {
  repo: string;
  commits: number;
  additions: number;
  deletions: number;
  pullRequestsOpened: number;
  pullRequestsMerged: number;
  pullRequestsClosed: number;
};
