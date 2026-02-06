export type TimedCacheEntry<T> = {
  value: T;
  expiresAtMs: number;
};

export class TimedCache<TKey, TValue> {
  private readonly ttlMs: number;
  private readonly store: Map<TKey, TimedCacheEntry<TValue>>;

  constructor(ttlMs: number) {
    if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
      throw new Error(`TimedCache ttlMs must be > 0; got ${ttlMs}`);
    }
    this.ttlMs = ttlMs;
    this.store = new Map<TKey, TimedCacheEntry<TValue>>();
  }

  get(key: TKey, nowMs: number = Date.now()): TValue | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (entry.expiresAtMs <= nowMs) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value;
  }

  set(key: TKey, value: TValue, nowMs: number = Date.now()): void {
    this.store.set(key, {
      value,
      expiresAtMs: nowMs + this.ttlMs,
    });
  }

  delete(key: TKey): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}
