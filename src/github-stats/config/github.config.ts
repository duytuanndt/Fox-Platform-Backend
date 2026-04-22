import { registerAs } from '@nestjs/config';
import { IsOptional, IsString } from 'class-validator';
import validateConfig from '../../utils/validate-config';
import { GithubConfig } from './github-config.type';

class EnvironmentVariablesValidator {
  @IsOptional()
  @IsString()
  GITHUB_TOKEN?: string;

  @IsOptional()
  @IsString()
  GITHUB_ORG?: string;

  @IsOptional()
  @IsString()
  GITHUB_REPOS?: string;

  @IsOptional()
  @IsString()
  GITHUB_INTERNAL_TOKEN?: string;

  @IsOptional()
  @IsString()
  GITHUB_BOT_PATTERNS?: string;

  @IsOptional()
  @IsString()
  GITHUB_IDENTITY_MAP?: string;

  @IsOptional()
  @IsString()
  GITHUB_APP_ID?: string;

  @IsOptional()
  @IsString()
  GITHUB_APP_CLIENT_ID?: string;

  @IsOptional()
  @IsString()
  GITHUB_APP_CLIENT_SECRET?: string;

  @IsOptional()
  @IsString()
  GITHUB_APP_INSTALLATION_ID?: string;

  @IsOptional()
  @IsString()
  GITHUB_APP_PRIVATE_KEY?: string;
}

export default registerAs<GithubConfig>('github', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    token: process.env.GITHUB_TOKEN,
    org: process.env.GITHUB_ORG,
    repos: (process.env.GITHUB_REPOS ?? '')
      .split(',')
      .map((repo) => repo.trim())
      .filter(Boolean),
    internalToken: process.env.GITHUB_INTERNAL_TOKEN,
    botPatterns: (process.env.GITHUB_BOT_PATTERNS ?? '[bot],dependabot')
      .split(',')
      .map((pattern) => pattern.trim().toLowerCase())
      .filter(Boolean),
    identityMap: (process.env.GITHUB_IDENTITY_MAP ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .reduce<Record<string, string>>((accumulator, item) => {
        const [githubLogin, internalMember] = item
          .split(':')
          .map((v) => v.trim());
        if (githubLogin && internalMember) {
          accumulator[githubLogin.toLowerCase()] = internalMember;
        }
        return accumulator;
      }, {}),
    appId: process.env.GITHUB_APP_ID,
    clientId: process.env.GITHUB_APP_CLIENT_ID,
    clientSecret: process.env.GITHUB_APP_CLIENT_SECRET,
    installationId: process.env.GITHUB_APP_INSTALLATION_ID,
    privateKey: process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };
});
