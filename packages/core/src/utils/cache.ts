import { createLogger } from './logger';
import { Env } from './env';

const logger = createLogger('cache');

class CacheItem<T> {
  constructor(
    public value: T,
    public lastAccessed: number,
    public ttl: number // Time-To-Live in milliseconds
  ) {}
}

export class Cache<K, V> {
  private static instances: Map<string, any> = new Map();
  private cache: Map<K, CacheItem<V>>;
  private maxSize: number;

  private constructor(maxSize: number) {
    this.cache = new Map<K, CacheItem<V>>();
    this.maxSize = maxSize;
  }

  /**
   * Get an instance of the cache with a specific name
   * @param name Unique identifier for this cache instance
   * @param maxSize Maximum size of the cache (only used when creating a new instance)
   */
  public static getInstance<K, V>(
    name: string,
    maxSize: number = Env.DEFAULT_MAX_CACHE_SIZE
  ): Cache<K, V> {
    if (!this.instances.has(name)) {
      logger.debug(`Creating new cache instance: ${name}`);
      this.instances.set(name, new Cache<K, V>(maxSize));
    }
    return this.instances.get(name) as Cache<K, V>;
  }

  stats(): string {
    return `Cache size: ${this.cache.size}`;
  }

  /**
   * Wrap a function with caching logic by immediately executing it with the provided arguments.
   * @param fn The function to wrap
   * @param key A unique key for caching
   * @param ttl Time-To-Live in seconds for the cached value
   * @param args The arguments to pass to the function
   */
  async wrap<T extends (...args: any[]) => any>(
    fn: T,
    key: K,
    ttl: number,
    ...args: Parameters<T>
  ): Promise<ReturnType<T>> {
    const cachedValue = this.get(key);
    if (cachedValue !== undefined) {
      return cachedValue as ReturnType<T>;
    }
    const result = await fn(...args);
    this.set(key, result, ttl);
    return result;
  }

  get(key: K, updateTTL: boolean = true): V | undefined {
    const item = this.cache.get(key);
    if (item) {
      const now = Date.now();
      if (now - item.lastAccessed > item.ttl) {
        this.cache.delete(key);
        return undefined;
      }
      if (updateTTL) {
        item.lastAccessed = now;
      }
      return item.value;
    }
    return undefined;
  }

  /**
   * Set a value in the cache with a specific TTL
   * @param key The key to set the value for
   * @param value The value to set
   * @param ttl The TTL in seconds
   */
  set(key: K, value: V, ttl: number): void {
    if (this.cache.size >= this.maxSize) {
      this.evict();
    }
    this.cache.set(key, new CacheItem<V>(value, Date.now(), ttl * 1000));
  }

  /**
   * Update the value of an existing key in the cache without changing the TTL
   * @param key The key to update
   * @param value The new value
   */
  update(key: K, value: V): void {
    const item = this.cache.get(key);
    if (item) {
      item.value = value;
    }
  }

  clear(): void {
    this.cache.clear();
  }

  private evict(): void {
    let oldestKey: K | undefined;
    let oldestTime = Infinity;

    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey !== undefined) {
      this.cache.delete(oldestKey);
    }
  }
}
