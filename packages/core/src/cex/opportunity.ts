import { formatGBP } from '../money/money.ts';
import { BUILD4, build4Profit, gtx1080BenchmarkProfit, type BuildProfitResult } from './profitability.ts';
import { performanceFor } from './performance.ts';
import { resolveCexMarketValue, type CexMarketStats, type SoldObservation } from './market.ts';
import type { CexDecision, BargainBand, CexProduct } from './types.ts';
import type { PriceBookEntry } from '../types/listing.ts';

export interface OpportunityWeights {
  finishedPcNet: number;
  roi: number;
  gpuPerfPerPound: number;
  marketDemand: number;
  vramAppeal: number;
  acquisitionRisk: number;
  powerCompat: number;
  resaleLiquidity: number;
}

export const DEFAULT_OPPORTUNITY_WEIGHTS: OpportunityWeights = {
  finishedPcNet: 0.3,
  roi: 0.15,
  gpuPerfPerPound: 0.15,
  marketDemand: 0.1,
  vramAppeal: 0.1,
  acquisitionRisk: 0.1,
  powerCompat: 0.05,
  resaleLiquidity: 0.05,
};

export interface OpportunityThresholds {
  minExpectedProfitPence: number;
  minExpectedRoiBps: number;
  minMarketDiscountBps: number;
  minConfidence: number;
}

export const DEFAULT_THRESHOLDS: OpportunityThresholds = {
  minExpectedProfitPence: 4000,
  minExpectedRoiBps: 1200,
  minMarketDiscountBps: 800,
  minConfidence: 0.35,
};

export interface OpportunityFactor {
  key: keyof OpportunityWeights;
  label: string;
  weight: number;
  rawScore: number;
  weighted: number;
  note: string;
}

export interface CexOpportunity {
  product: CexProduct;
  profit: BuildProfitResult;
  benchmark: BuildProfitResult;
  beatsGtx1080Benchmark: boolean;
  score: number;
  factors: OpportunityFactor[];
  decision: CexDecision;
  bargainBand: BargainBand;
  market: CexMarketStats;
  marketDiscountBps: number | null;
  maxBuyPence: number;
  confidence: number;
  reasoning: string[];
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function factor(
  key: keyof OpportunityWeights,
  label: string,
  weight: number,
  rawScore: number,
  note: string,
): OpportunityFactor {
  const raw = clamp01(rawScore);
  return { key, label, weight, rawScore: raw, weighted: raw * weight, note };
}

export function classifyBargain(discountBps: number | null, profit: BuildProfitResult): BargainBand {
  const net = profit.net?.pence ?? -1;
  if (net < 0) return 'OVERPRICED';
  if (discountBps === null) return net >= 4000 ? 'MARKET_PRICE' : 'OVERPRICED';
  if (discountBps >= 1800 && net >= 5000) return 'SIGNIFICANTLY_UNDERPRICED';
  if (discountBps >= 800 && net >= 2500) return 'UNDERPRICED';
  if (discountBps < -500) return 'OVERPRICED';
  return 'MARKET_PRICE';
}

export function decide(
  profit: BuildProfitResult,
  band: BargainBand,
  confidence: number,
  beats1080: boolean,
  thresholds: OpportunityThresholds,
  psuIncompatible: boolean,
): CexDecision {
  const net = profit.net?.pence ?? -1;
  const roi = profit.roiBps ?? -1;
  if (psuIncompatible || net < 0) return 'PASS';
  if (confidence < thresholds.minConfidence) return 'WATCH';
  if (
    net >= thresholds.minExpectedProfitPence &&
    roi >= thresholds.minExpectedRoiBps &&
    (band === 'SIGNIFICANTLY_UNDERPRICED' || band === 'UNDERPRICED' || beats1080)
  ) {
    return 'BUY';
  }
  if (net >= 2000 && roi >= 800) return 'OFFER';
  if (net >= 0) return 'WATCH';
  return 'PASS';
}

/**
 * Hard max purchase: CeX sell at which net still clears MIN_EXPECTED_PROFIT,
 * capped at 95% of observed market value when we have one.
 */
export function hardMaxBuyPence(
  profit: BuildProfitResult,
  marketValuePence: number | null,
  thresholds: OpportunityThresholds,
): number {
  const net = profit.net?.pence ?? 0;
  const slack = net - thresholds.minExpectedProfitPence;
  const fromProfit = profit.gpuLanded.pence + slack;
  const fromMarket = marketValuePence === null ? fromProfit : Math.floor(marketValuePence * 0.95);
  return Math.max(0, Math.min(fromProfit, fromMarket));
}

export function scoreOpportunity(
  product: CexProduct,
  opts: {
    priceBook?: readonly PriceBookEntry[];
    sold?: readonly SoldObservation[];
    allowDemoMarket?: boolean;
    weights?: OpportunityWeights;
    thresholds?: OpportunityThresholds;
  } = {},
): CexOpportunity {
  const weights = opts.weights ?? DEFAULT_OPPORTUNITY_WEIGHTS;
  const thresholds = opts.thresholds ?? DEFAULT_THRESHOLDS;
  const profit = build4Profit(product);
  const benchmark = gtx1080BenchmarkProfit();
  const net = profit.net?.pence ?? 0;
  const benchNet = benchmark.net?.pence ?? 0;
  const beatsGtx1080Benchmark = net > benchNet + 500;
  const market = resolveCexMarketValue(product.modelKey, opts.priceBook ?? [], opts.sold ?? [], opts.allowDemoMarket === true);
  const marketPence = market.marketValue?.pence ?? null;
  const discountBps =
    marketPence && marketPence > 0 && product.sell
      ? Math.round(((marketPence - product.sell.pence) / marketPence) * 10_000)
      : null;

  const perf = performanceFor(product.modelKey);
  const perfPerPound =
    profit.gpuLanded.pence > 0 ? (perf?.relative1080p ?? 40) / (profit.gpuLanded.pence / 100) : 0;
  const genScore = perf ? (Number.parseInt(perf.generation.replace(/\D/g, ''), 10) >= 30 ? 1 : 0.75) : 0.5;

  const factors: OpportunityFactor[] = [
    factor(
      'finishedPcNet',
      'Expected finished-PC net profit',
      weights.finishedPcNet,
      net / 12_000,
      profit.net ? `${formatGBP(profit.net)} net on ${BUILD4.name}` : 'No expected sale — INSUFFICIENT_DATA',
    ),
    factor(
      'roi',
      'ROI %',
      weights.roi,
      (profit.roiBps ?? 0) / 3500,
      profit.roiBps !== null ? `${(profit.roiBps / 100).toFixed(1)}% on total landed` : 'ROI unknown',
    ),
    factor(
      'gpuPerfPerPound',
      'GPU performance / £',
      weights.gpuPerfPerPound,
      perfPerPound / 1.2,
      `${perf?.relative1080p ?? 0} 1080p index · ${perfPerPound.toFixed(2)} /£`,
    ),
    factor(
      'marketDemand',
      'Market demand (sold comps)',
      weights.marketDemand,
      Math.min(1, market.sampleSize / 8),
      market.notes,
    ),
    factor(
      'vramAppeal',
      'VRAM / generation appeal',
      weights.vramAppeal,
      Math.min(1, ((product.vramGb ?? 4) / 12) * genScore),
      `${product.vramGb ?? '?'} GB · ${perf?.generation ?? 'unknown gen'}`,
    ),
    factor(
      'acquisitionRisk',
      'Acquisition risk (inverted)',
      weights.acquisitionRisk,
      profit.confidence,
      profit.confidence < 0.5 ? 'Thin valuation evidence' : 'Usable valuation evidence',
    ),
    factor(
      'powerCompat',
      'Power / compatibility',
      weights.powerCompat,
      profit.psuScore,
      profit.psuReason,
    ),
    factor(
      'resaleLiquidity',
      'Resale liquidity',
      weights.resaleLiquidity,
      (perf?.resaleDesirability ?? 40) / 100,
      `Resale desirability ${perf?.resaleDesirability ?? 40}/100`,
    ),
  ];

  const score = Math.round(factors.reduce((s, f) => s + f.weighted, 0) * 100);
  const band = classifyBargain(discountBps, profit);
  const confidence = Math.min(profit.confidence, market.confidence || profit.confidence);
  const decision = decide(profit, band, confidence, beatsGtx1080Benchmark, thresholds, profit.psu === 'INCOMPATIBLE');
  const maxBuyPence = hardMaxBuyPence(profit, marketPence, thresholds);

  const reasoning: string[] = [
    `CeX sell ${product.sell ? formatGBP(product.sell) : '—'} · landed ${formatGBP(profit.gpuLanded)}`,
    `Build 4 expected PC sale ${profit.expectedSale ? formatGBP(profit.expectedSale) : 'INSUFFICIENT_DATA'} · net ${profit.net ? formatGBP(profit.net) : '—'} · ROI ${profit.roiBps !== null ? `${(profit.roiBps / 100).toFixed(1)}%` : '—'}`,
    `GTX 1080 @ £100.15 benchmark net ${benchmark.net ? formatGBP(benchmark.net) : '—'} — this card ${beatsGtx1080Benchmark ? 'BEATS' : 'does not beat'} that net by a material margin`,
    `PSU ${profit.psu} · CPU ${profit.cpuBalance} (${profit.cpuBalanceNote})`,
    band === 'SIGNIFICANTLY_UNDERPRICED' || band === 'UNDERPRICED'
      ? `Market band ${band}${discountBps !== null ? ` (${(discountBps / 100).toFixed(1)}% vs evidence)` : ''}`
      : `Market band ${band} — cheap is not automatically a bargain after fees, postage, and risk`,
    `Decision ${decision} · hard max ${formatGBP({ pence: maxBuyPence, currency: 'GBP' })}`,
  ];
  if (profit.cpuUpgrade) {
    reasoning.push(
      `CPU upgrade ${profit.cpuUpgrade.cpuName} @ ${formatGBP(profit.cpuUpgrade.upgradeCost)} lifts net to ${formatGBP(profit.cpuUpgrade.netWithUpgrade)} (Δ ${formatGBP(profit.cpuUpgrade.deltaNet)})`,
    );
  }
  if (market.kind === 'DEMO_SYNTHETIC' || product.dataSource === 'DEMO_SYNTHETIC') {
    reasoning.push('DEMO_SYNTHETIC data — not live CeX/eBay evidence.');
  }

  return {
    product,
    profit,
    benchmark,
    beatsGtx1080Benchmark,
    score,
    factors,
    decision,
    bargainBand: band,
    market,
    marketDiscountBps: discountBps,
    maxBuyPence,
    confidence,
    reasoning,
  };
}

export type OpportunitySort =
  | 'BEST_OPPORTUNITY'
  | 'HIGHEST_PROFIT'
  | 'BEST_ROI'
  | 'CHEAPEST'
  | 'BEST_PERFORMANCE_PER_POUND'
  | 'BIGGEST_MARKET_DISCOUNT'
  | 'NEW_STOCK'
  | 'PRICE_DROP';

export function sortOpportunities(
  rows: readonly CexOpportunity[],
  sort: OpportunitySort,
  diffs?: ReadonlyMap<string, string>,
): CexOpportunity[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    switch (sort) {
      case 'HIGHEST_PROFIT':
        return (b.profit.net?.pence ?? -999999) - (a.profit.net?.pence ?? -999999);
      case 'BEST_ROI':
        return (b.profit.roiBps ?? -9999) - (a.profit.roiBps ?? -9999);
      case 'CHEAPEST':
        return (a.product.sell?.pence ?? 0) - (b.product.sell?.pence ?? 0);
      case 'BEST_PERFORMANCE_PER_POUND':
        return (b.profit.performancePerPound ?? 0) - (a.profit.performancePerPound ?? 0);
      case 'BIGGEST_MARKET_DISCOUNT':
        return (b.marketDiscountBps ?? -9999) - (a.marketDiscountBps ?? -9999);
      case 'NEW_STOCK':
        return Number(diffs?.get(b.product.boxId) === 'NEW') - Number(diffs?.get(a.product.boxId) === 'NEW');
      case 'PRICE_DROP':
        return Number(diffs?.get(b.product.boxId) === 'PRICE_DROP') - Number(diffs?.get(a.product.boxId) === 'PRICE_DROP');
      default:
        return b.score - a.score;
    }
  });
  return copy;
}
