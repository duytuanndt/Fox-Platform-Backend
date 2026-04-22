import { Module } from '@nestjs/common';
import { GithubClient } from './github.client';
import { GithubAdapter } from './github.adapter';
import { GITHUB_DATA_PORT } from '../../ports/github-data.port';

@Module({
  providers: [
    GithubClient,
    GithubAdapter,
    {
      provide: GITHUB_DATA_PORT,
      useExisting: GithubAdapter,
    },
  ],
  exports: [GITHUB_DATA_PORT],
})
export class GithubModule {}
