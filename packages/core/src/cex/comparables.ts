import { compactText } from '../parsers/normalise.ts';
import { money, type Money } from '../money/money.ts';
import { performanceFor } from './performance.ts';

export interface PcComparableListing {
  readonly itemId: string;
  readonly title: string;
  readonly itemWebUrl?: string | null;
  readonly itemPrice: Money;
  readonly postage?: Money | null;
  readonly condition?: string | null;
  readonly sold?: boolean;
}

export interface CompletePcMatch {
  readonly listing: PcComparableListing;
  readonly match: 'EXACT_COMPONENT' | 'BROAD_MARKET';
  readonly gpuHit: boolean;
  readonly cpuHit: boolean;
  readonly ramHit: boolean;
  readonly storageHit: boolean;
}

const CPU_TIERS: Record<string, string[]> = {
  'r5-2400g': ['RYZEN 5', 'R5 ', '2400G'],
  'r5-3600': ['RYZEN 5 3600', 'R5 3600', '3600X', 'RYZEN 5'],
  'r5-3600x': ['RYZEN 5 3600', 'R5 3600', '3600X', 'RYZEN 5'],
  'r5-5600': ['RYZEN 5 5600', 'R5 5600', '5600X', 'RYZEN 5'],
};

function gpuNeedles(modelKey: string | null): string[] {
  const profile = performanceFor(modelKey);
  const name = profile?.displayName ?? modelKey ?? '';
  const compact = compactText(name);
  const extra: string[] = [];
  if (modelKey === 'rx-6600') extra.push('RX 6600', 'RX6600');
  if (modelKey === 'gtx-1080') extra.push('GTX 1080', 'GTX1080', '1080 8GB');
  if (modelKey === 'gtx-1660-super') extra.push('1660 SUPER', '1660S');
  if (modelKey === 'rtx-3060' || modelKey === 'rtx-3060-8gb') extra.push('RTX 3060', 'RTX3060');
  return [...new Set([compact, ...extra.map(compactText)].filter(Boolean))];
}

function hasAny(hay: string, needles: readonly string[]): boolean {
  return needles.some((n) => n && hay.includes(n));
}

/**
 * Match complete gaming PCs from existing eBay listings (sold preferred).
 * Exact: GPU + a specific CPU model token.
 * Broad: GPU + Ryzen 5 (sellers often omit the exact CPU).
 */
export function matchCompletePcs(
  listings: readonly PcComparableListing[],
  opts: { gpuKey: string | null; cpuKey?: string; ramGb?: number; storageGb?: number },
): CompletePcMatch[] {
  const gpu = gpuNeedles(opts.gpuKey);
  if (gpu.length === 0) return [];
  const cpuNeedles = CPU_TIERS[opts.cpuKey ?? 'r5-2400g'] ?? ['RYZEN 5'];
  const exactCpu = cpuNeedles.filter((n) => !['RYZEN 5', 'R5 '].includes(n));
  const ram = opts.ramGb === 16 ? ['16GB', '16 GB', '2X8'] : [];
  const storage = opts.storageGb && opts.storageGb >= 1000 ? ['1TB', '1 TB', '1000GB'] : [];

  const out: CompletePcMatch[] = [];
  for (const listing of listings) {
    const hay = compactText(listing.title);
    const gpuHit = hasAny(hay, gpu);
    if (!gpuHit) continue;
    const pcLanguage = /GAMING PC|DESKTOP PC|TOWER|COMPLETE PC|WINDOWS|WIFI|WI FI/.test(hay) || hay.includes('PC');
    if (!pcLanguage) continue;
    const cpuExact = hasAny(hay, exactCpu.map(compactText));
    const cpuBroad = hasAny(hay, ['RYZEN 5', 'R5']);
    if (!cpuExact && !cpuBroad) continue;
    const ramHit = ram.length === 0 || hasAny(hay, ram.map(compactText));
    const storageHit = storage.length === 0 || hasAny(hay, storage.map(compactText));
    out.push({
      listing,
      match: cpuExact ? 'EXACT_COMPONENT' : 'BROAD_MARKET',
      gpuHit,
      cpuHit: cpuExact || cpuBroad,
      ramHit,
      storageHit,
    });
  }
  return out.sort((a, b) => {
    if (a.match !== b.match) return a.match === 'EXACT_COMPONENT' ? -1 : 1;
    if ((a.listing.sold ? 1 : 0) !== (b.listing.sold ? 1 : 0)) return a.listing.sold ? -1 : 1;
    return a.listing.itemPrice.pence - b.listing.itemPrice.pence;
  });
}

export function medianComparablePence(matches: readonly CompletePcMatch[], soldOnly = true): Money | null {
  const prices = matches
    .filter((m) => (soldOnly ? m.listing.sold : true))
    .map((m) => m.listing.itemPrice.pence + (m.listing.postage?.pence ?? 0));
  if (prices.length === 0) return null;
  const sorted = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const pence = sorted.length % 2 ? sorted[mid]! : Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
  return money(pence);
}
