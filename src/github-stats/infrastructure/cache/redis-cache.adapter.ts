import { Injectable } from '@nestjs/common';
import { CachePort } from '../../ports/cache.port';

type CacheEntry = {
  value: unknown;
  expiresAt: number;
};

@Injectable()
export class RedisCacheAdapter implements CachePort {
  private readonly store = new Map<string, CacheEntry>();

  get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) {
      return Promise.resolve(null);
    }

    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return Promise.resolve(null);
    }

    return Promise.resolve(entry.value as T);
  }

  set<T>(key: string, value: T, ttlInSeconds: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlInSeconds * 1000,
    });
    return Promise.resolve();
  }

  delete(key: string): Promise<void> {
    this.store.delete(key);
    return Promise.resolve();
  }
}
