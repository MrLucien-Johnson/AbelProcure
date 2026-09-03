import { describe, expect, it } from 'vitest';
import { expandKeyword } from '../search/expansion.ts';
import { GPU_MODELS } from '../catalog/models.ts';
import { expandSearch } from '../search/expansion.ts';
import { analyseDescription } from '../analysis/description.ts';
import { DisabledBiddingProvider, BIDDING_STATUS } from '../ebay/bidding.ts';
import { facebookMarketplaceProvider } from '../marketplace/stubs.ts';

describe('search expansion', () => {
  it('expands RX 6600 with aliases, typos and no-space variants', () => {
    const model = GPU_MODELS.find((m) => m.key === 'rx-6600');
    expect(model).toBeTruthy();
    const queries = expandSearch(model!);
    const qs = queries.map((q) => q.q.toLowerCase());
    expect(qs.some((q) => q.includes('6600'))).toBe(true);
    expect(qs).toContain('rx6600');
    expect(qs.some((q) => q.includes('spares'))).toBe(true);
  });

  it('expandKeyword falls back for unknown text', () => {
    const q = expandKeyword('weird custom loop block');
    expect(q[0]?.q).toBe('weird custom loop block');
  });
});

describe('description analysis', () => {
  it('extracts positive and negative phrases', () => {
    const r = analyseDescription('Fully tested working card but artefacts on screen. Untested HDMI port.');
    expect(r.positive).toContain('fully tested');
    expect(r.negative).toContain('artefact');
    expect(r.negative).toContain('untested');
  });
});

describe('disabled integrations', () => {
  it('does not place bids', async () => {
    const bidding = new DisabledBiddingProvider();
    expect(bidding.status).toBe(BIDDING_STATUS);
    await expect(bidding.placeProxyBid()).rejects.toMatchObject({ code: BIDDING_STATUS });
  });

  it('does not scrape unsupported marketplaces', async () => {
    await expect(facebookMarketplaceProvider.search()).rejects.toMatchObject({ code: 'NOT_IMPLEMENTED' });
  });
});
