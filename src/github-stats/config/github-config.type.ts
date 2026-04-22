export type GithubConfig = {
  token?: string;
  org?: string;
  repos: string[];
  internalToken?: string;
  botPatterns: string[];
  identityMap: Record<string, string>;
  appId?: string;
  clientId?: string;
  clientSecret?: string;
  installationId?: string;
  privateKey?: string;
};
