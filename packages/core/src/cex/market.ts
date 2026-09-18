import { money, type Money } from '../money/money.ts';
import type { PriceBookEntry } from '../types/listing.ts';
import type { MarketValueKind } from '../types/enums.ts';

export interface CexMarketStats {
  readonly modelKey: string;
  readonly marketValue: Money | null;
  readonly sampleSize: number;
  readonly lowPence: number | null;
  readonly highPence: number | null;
  readonly kind: MarketValueKind | 'DEMO_SYNTHETIC' | 'INSUFFICIENT_DATA';
  readonly confidence: number;
  readonly notes: string;
}

/**
 * Illustrative DEMO_SYNTHETIC GPU sold-band estimates for the local UI/tests.
 * Production valuation uses the owner's price book / verified sold observations.
 * These numbers are NOT live eBay solds.
 */
export const DEMO_GPU_MARKET: Readonly<Record<string, { medianPence: number; n: number; low: number; high: number }>> = {
  'rx-6600': { medianPence: 13000, n: 9, low: 11500, high: 14800 },
  'rx-6600-xt': { medianPence: 15500, n: 6, low: 13800, high: 17500 },
  'rtx-3060': { medianPence: 18500, n: 8, low: 16000, high: 21000 },
  'rtx-3060-8gb': { medianPence: 15500, n: 5, low: 14000, high: 17500 },
  'rtx-3060-ti': { medianPence: 21500, n: 7, low: 19000, high: 24500 },
  'gtx-1660-super': { medianPence: 9800, n: 10, low: 8500, high: 11500 },
  'gtx-1080': { medianPence: 11500, n: 8, low: 9500, high: 13500 },
  'rx-580': { medianPence: 5200, n: 12, low: 4000, high: 6500 },
};

export interface SoldObservation {
  readonly modelKey: string;
  readonly pricePence: number;
  readonly observedAt: string;
  readonly title?: string;
}

function trimmedMean(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length >= 6) {
    const drop = Math.max(1, Math.floor(sorted.length * 0.1));
    const sliced = sorted.slice(drop, sorted.length - drop);
    return Math.round(sliced.reduce((s, n) => s + n, 0) / sliced.length);
  }
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
}

export function statsFromSold(modelKey: string, observations: readonly SoldObservation[]): CexMarketStats | null {
  const prices = observations.filter((o) => o.modelKey === modelKey).map((o) => o.pricePence);
  if (prices.length === 0) return null;
  const sorted = [...prices].sort((a, b) => a - b);
  const median = trimmedMean(sorted);
  return {
    modelKey,
    marketValue: median === null ? null : money(median),
    sampleSize: prices.length,
    lowPence: sorted[0] ?? null,
    highPence: sorted[sorted.length - 1] ?? null,
    kind: 'VERIFIED_SOLD_PRICE_DATA',
    confidence: Math.min(0.9, 0.4 + prices.length * 0.06),
    notes: `${prices.length} sold observations (trimmed mean/median; outliers do not dominate).`,
  };
}

export function resolveCexMarketValue(
  modelKey: string | null,
  priceBook: readonly PriceBookEntry[] = [],
  sold: readonly SoldObservation[] = [],
  allowDemoFallback = false,
): CexMarketStats {
  if (!modelKey) {
    return {
      modelKey: 'unknown',
      marketValue: null,
      sampleSize: 0,
      lowPence: null,
      highPence: null,
      kind: 'INSUFFICIENT_DATA',
      confidence: 0.1,
      notes: 'GPU model not recognised — will not invent a market value.',
    };
  }
  const fromSold = statsFromSold(modelKey, sold);
  if (fromSold) return fromSold;

  const book = priceBook.find((p) => p.modelKey === modelKey);
  if (book?.expectedResalePrice) {
    return {
      modelKey,
      marketValue: book.expectedResalePrice,
      sampleSize: 0,
      lowPence: book.desiredBuyPrice?.pence ?? null,
      highPence: book.absoluteMaxBuyPrice?.pence ?? null,
      kind: 'USER_PRICE_BOOK',
      confidence: book.confidence === 'HIGH' ? 0.8 : book.confidence === 'MEDIUM' ? 0.6 : 0.4,
      notes: book.notes || 'Owner price book expected resale (not an asking-price scrape).',
    };
  }

  if (allowDemoFallback && DEMO_GPU_MARKET[modelKey]) {
    const d = DEMO_GPU_MARKET[modelKey]!;
    return {
      modelKey,
      marketValue: money(d.medianPence),
      sampleSize: d.n,
      lowPence: d.low,
      highPence: d.high,
      kind: 'DEMO_SYNTHETIC',
      confidence: 0.42,
      notes: 'DEMO_SYNTHETIC sold-band estimate for UI/tests — not live eBay sold data.',
    };
  }

  return {
    modelKey,
    marketValue: null,
    sampleSize: 0,
    lowPence: null,
    highPence: null,
    kind: 'INSUFFICIENT_DATA',
    confidence: 0.15,
    notes: 'No sold evidence and empty price book. Asking prices are not used as expected resale.',
  };
}
