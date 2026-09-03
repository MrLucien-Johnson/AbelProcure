export class RateLimitManager {
  private readonly timestamps: number[] = [];

  constructor(
    private readonly maxPerWindow: number,
    private readonly windowMs: number,
  ) {}

  tryConsume(now = Date.now()): boolean {
    this.prune(now);
    if (this.timestamps.length >= this.maxPerWindow) return false;
    this.timestamps.push(now);
    return true;
  }

  remaining(now = Date.now()): number {
    this.prune(now);
    return Math.max(0, this.maxPerWindow - this.timestamps.length);
  }

  private prune(now: number): void {
    const cutoff = now - this.windowMs;
    while (this.timestamps[0] !== undefined && this.timestamps[0] < cutoff) {
      this.timestamps.shift();
    }
  }
}

export class RequestCache<T> {
  private readonly map = new Map<string, { expires: number; value: T }>();

  constructor(private readonly ttlMs: number) {}

  get(key: string, now = Date.now()): T | undefined {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    if (hit.expires <= now) {
      this.map.delete(key);
      return undefined;
    }
    return hit.value;
  }

  set(key: string, value: T, now = Date.now()): void {
    this.map.set(key, { value, expires: now + this.ttlMs });
  }
}

export function prioritiseEndingSoon<T extends { minutesRemaining: number | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const am = a.minutesRemaining ?? Number.POSITIVE_INFINITY;
    const bm = b.minutesRemaining ?? Number.POSITIVE_INFINITY;
    return am - bm;
  });
}
