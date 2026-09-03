import { describe, expect, it } from 'vitest';
import { RateLimitManager, RequestCache, prioritiseEndingSoon } from '../jobs/rateLimit.ts';
import { hashPayload, PERMISSION_REQUIRED } from '../ebay/webhooks.ts';
import { BIDDING_STATUS } from '@abelprocure/core';

describe('rateLimitManager', () => {
  it('blocks after the window is exhausted', () => {
    const rl = new RateLimitManager(2, 1000);
    expect(rl.tryConsume(0)).toBe(true);
    expect(rl.tryConsume(1)).toBe(true);
    expect(rl.tryConsume(2)).toBe(false);
    expect(rl.tryConsume(1001)).toBe(true);
  });
});

describe('requestCache', () => {
  it('expires entries', () => {
    const cache = new RequestCache<string>(100);
    cache.set('a', 'one', 0);
    expect(cache.get('a', 50)).toBe('one');
    expect(cache.get('a', 101)).toBeUndefined();
  });
});

describe('searchScheduler priority', () => {
  it('puts ending-soon auctions first', () => {
    const ranked = prioritiseEndingSoon([
      { minutesRemaining: 120 },
      { minutesRemaining: 5 },
      { minutesRemaining: null },
    ]);
    expect(ranked[0]?.minutesRemaining).toBe(5);
  });
});

describe('webhooks', () => {
  it('marks buyer bid topics as permission required', () => {
    expect(PERMISSION_REQUIRED.has('OUTBID')).toBe(true);
    expect(PERMISSION_REQUIRED.has('BID_PLACED')).toBe(true);
  });

  it('hashes payloads for idempotency keys', async () => {
    const a = await hashPayload('{"notificationId":"1"}');
    const b = await hashPayload('{"notificationId":"1"}');
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });
});

describe('security posture', () => {
  it('does not enable automatic bidding', () => {
    expect(BIDDING_STATUS).toBe('DISABLED_PENDING_EBAY_APPROVAL');
  });
});
