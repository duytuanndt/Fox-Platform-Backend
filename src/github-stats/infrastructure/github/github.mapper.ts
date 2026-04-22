import { GithubRepository } from '../../ports/github-data.port';

export class GithubMapper {
  static toRepository(
    input: Pick<GithubRepository, 'name' | 'fullName' | 'private'>,
  ): GithubRepository {
    return {
      name: input.name,
      fullName: input.fullName,
      private: input.private,
    };
  }
}
