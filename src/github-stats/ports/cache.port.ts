export const CACHE_PORT = Symbol('CACHE_PORT');

export interface CachePort {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlInSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
}
