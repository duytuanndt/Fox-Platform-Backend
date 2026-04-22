import { Module } from '@nestjs/common';
import { CACHE_PORT } from '../../ports/cache.port';
import { RedisCacheAdapter } from './redis-cache.adapter';

@Module({
  providers: [
    RedisCacheAdapter,
    {
      provide: CACHE_PORT,
      useExisting: RedisCacheAdapter,
    },
  ],
  exports: [CACHE_PORT],
})
export class CacheModule {}
