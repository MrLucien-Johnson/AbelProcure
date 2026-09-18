import { describe, expect, it } from 'vitest';
import { DEMO_NOW_ISO, DEMO_PRICE_BOOK, SCENARIO_A, SCENARIO_B, SCENARIO_C, SCENARIO_D } from '../fixtures/demo.ts';
import { evaluateListing } from '../scoring/evaluate.ts';
import type { BuildSnapshot } from '../scoring/evaluate.ts';
import { money } from '../money/money.ts';

const build4: BuildSnapshot = {
  id: 'build-4',
  name: 'BUILD 4',
  missingTypes: ['GPU'],
  partsCost: money(12100),
  projectedResale: money(49900),
  targetMargin: money(15000),
};

describe('PCDealScore fixtures', () => {
  it('A: RX 6600 £70 + £5 postage vs £125 market is a high score', () => {
    const deal = evaluateListing(SCENARIO_A, {
      now: DEMO_NOW_ISO,
      priceBook: DEMO_PRICE_BOOK,
      builds: [build4],
    });
    expect(deal.landed.landedCost.pence).toBe(7500);
    expect(deal.score.total).toBeGreaterThanOrEqual(80);
    expect(['EXCEPTIONAL', 'STRONG_BUY', 'GOOD']).toContain(deal.score.band);
    expect(deal.buildImpact?.buildName).toBe('BUILD 4');
  });

  it('B: RX 6600 £120 + £10 postage near market is a low score', () => {
    const deal = evaluateListing(SCENARIO_B, { now: DEMO_NOW_ISO, priceBook: DEMO_PRICE_BOOK });
    expect(deal.landed.landedCost.pence).toBe(13000);
    expect(deal.score.total).toBeLessThan(70);
  });

  it('C: cheap but faulty scores price value with significantly higher risk', () => {
    const deal = evaluateListing(SCENARIO_C, { now: DEMO_NOW_ISO, priceBook: DEMO_PRICE_BOOK });
    const price = deal.score.factors.find((f) => f.key === 'PRICE_VALUE');
    expect(price?.awarded).toBeGreaterThan(10);
    expect(deal.riskScore).toBeGreaterThan(50);
    expect(deal.riskSignals.some((s) => /fault|artefact|parts/i.test(s))).toBe(true);
  });

  it('D: Ryzen 5 5600 ending in 5 minutes has high auction opportunity', () => {
    const deal = evaluateListing(SCENARIO_D, { now: DEMO_NOW_ISO, priceBook: DEMO_PRICE_BOOK });
    const auction = deal.score.factors.find((f) => f.key === 'AUCTION_OPPORTUNITY');
    expect(auction?.awarded).toBeGreaterThanOrEqual(4);
    expect(deal.score.recommendedAction).toMatch(/URGENT|max bid/i);
  });

  it('never treats missing market data as verified sold prices', () => {
    const deal = evaluateListing(SCENARIO_A, { now: DEMO_NOW_ISO, priceBook: [] });
    expect(deal.market.confidence).toBe('INSUFFICIENT_DATA');
    expect(deal.market.kind).toBe('ACTIVE_LISTING_ESTIMATE');
    expect(deal.market.notes).toMatch(/not treated as sold/);
  });

  it('factors always total a 0–100 score with inspectable rows', () => {
    const deal = evaluateListing(SCENARIO_A, { now: DEMO_NOW_ISO, priceBook: DEMO_PRICE_BOOK });
    const sum = deal.score.factors.reduce((a, f) => a + f.max, 0);
    expect(sum).toBe(100);
    expect(deal.score.version).toBe('PCDealScore-v1');
  });
});
