import type { CexOpportunity } from './opportunity.ts';
import type { CexSnapshotDiff } from './types.ts';
import type { AlertType } from '../types/enums.ts';

export interface CexAlertDraft {
  id: string;
  type: AlertType | string;
  title: string;
  body: string;
  at: string;
  read: boolean;
  severity: 'critical' | 'opportunity' | 'info';
  url?: string | null;
}

export interface CexAlertThresholds {
  minExpectedProfitPence: number;
  minExpectedRoiBps: number;
  minMarketDiscountBps: number;
  minConfidence: number;
}

const DEFAULT: CexAlertThresholds = {
  minExpectedProfitPence: 4000,
  minExpectedRoiBps: 1200,
  minMarketDiscountBps: 800,
  minConfidence: 0.4,
};

export function cexAlertDedupeKey(kind: string, boxId: string, day = new Date().toISOString().slice(0, 10)): string {
  return `cex:${kind}:${boxId}:${day}`;
}

export function shouldAlertOpportunity(opp: CexOpportunity, t: CexAlertThresholds = DEFAULT): boolean {
  if (opp.confidence < t.minConfidence) return false;
  if (opp.decision !== 'BUY' && opp.decision !== 'OFFER') return false;
  if ((opp.profit.net?.pence ?? 0) < t.minExpectedProfitPence) return false;
  if ((opp.profit.roiBps ?? 0) < t.minExpectedRoiBps) return false;
  if (opp.marketDiscountBps !== null && opp.marketDiscountBps < t.minMarketDiscountBps && !opp.beatsGtx1080Benchmark) {
    return false;
  }
  return true;
}

export function alertFromOpportunity(opp: CexOpportunity, now = new Date().toISOString()): CexAlertDraft | null {
  if (!shouldAlertOpportunity(opp)) return null;
  const p = opp.product;
  const kind = opp.bargainBand === 'SIGNIFICANTLY_UNDERPRICED' ? 'CEX_SIGNIFICANT_BARGAIN' : 'CEX_GPU_BARGAIN';
  const gbp = (pence: number | null | undefined) =>
    pence === null || pence === undefined ? '—' : `£${(pence / 100).toFixed(2)}`;
  return {
    id: cexAlertDedupeKey(kind, p.boxId, now.slice(0, 10)),
    type: kind,
    severity: opp.decision === 'BUY' ? 'critical' : 'opportunity',
    title: `🔥 CEX GPU ${opp.decision}: ${p.normalisedModel ?? p.title}`,
    body: [
      p.title,
      `CeX: ${gbp(p.sell?.pence)}`,
      opp.market.marketValue ? `Recent eBay sold median: ${gbp(opp.market.marketValue.pence)} (${opp.market.kind})` : 'No sold median',
      `Build 4 total: ${gbp(opp.profit.buildCost.pence)}`,
      `Expected PC resale: ${gbp(opp.profit.expectedSale?.pence)}`,
      `Expected net profit: ${gbp(opp.profit.net?.pence)}`,
      `PSU: ${opp.profit.psu}`,
      `CPU: ${opp.profit.cpuBalance}`,
      `Decision: ${opp.decision}`,
      `Hard maximum: ${gbp(opp.maxBuyPence)}`,
      opp.reasoning.join(' · '),
    ].join('\n'),
    at: now,
    url: p.productUrl,
    read: false,
  };
}

export function alertFromSnapshotEvent(
  event: CexSnapshotDiff,
  boxName: string,
  url: string | null,
  now = new Date().toISOString(),
): CexAlertDraft | null {
  if (event.event === 'UNCHANGED' || event.event === 'PRICE_INCREASE' || event.event === 'OUT_OF_STOCK') return null;
  const interesting =
    event.event === 'NEW' ||
    event.event === 'RESTOCKED' ||
    (event.event === 'PRICE_DROP' && (event.previousSellPence ?? 0) - (event.currentSellPence ?? 0) >= 800);
  if (!interesting) return null;
  const type = event.event === 'PRICE_DROP' ? 'CEX_PRICE_DROP' : event.event === 'NEW' ? 'CEX_NEW' : 'CEX_RESTOCKED';
  return {
    id: cexAlertDedupeKey(event.event, event.boxId, now.slice(0, 10)),
    type,
    severity: event.event === 'PRICE_DROP' ? 'opportunity' : 'info',
    title: `CeX ${event.event}: ${boxName}`,
    body: `${boxName} · ${event.event} · sell ${((event.currentSellPence ?? 0) / 100).toFixed(2)}`,
    at: now,
    url,
    read: false,
  };
}

export function dedupeAlerts(existingKeys: Set<string>, incoming: CexAlertDraft[]): CexAlertDraft[] {
  const out: CexAlertDraft[] = [];
  for (const a of incoming) {
    if (existingKeys.has(a.id)) continue;
    existingKeys.add(a.id);
    out.push(a);
  }
  return out;
}
