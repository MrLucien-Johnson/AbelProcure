import type { SearchQuery } from '../search/types.ts';
import type { CexOpportunity } from './opportunity.ts';
import { CEX_CATEGORIES, type CexProduct, type CexSnapshotDiff } from './types.ts';

export function compactCexNeedle(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, '');
}

export function cexInventoryHaystack(product: CexProduct, extra: readonly string[] = []): string {
  return [
    product.title,
    product.normalisedModel,
    product.manufacturer,
    product.modelKey,
    product.family,
    product.variant,
    product.boxId,
    product.availability,
    product.vramGb !== null ? `${product.vramGb}gb` : '',
    product.raw.categoryName,
    ...extra,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function matchesCexQuery(haystack: string, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return haystack.includes(needle) || haystack.replace(/\s+/g, '').includes(compactCexNeedle(query));
}

export function filterCexOpportunities(opps: readonly CexOpportunity[], query: string): CexOpportunity[] {
  if (!query.trim()) return [...opps];
  return opps.filter((o) =>
    matchesCexQuery(
      cexInventoryHaystack(o.product, [o.decision, o.bargainBand, o.profit.psu, o.profit.cpuBalance]),
      query,
    ),
  );
}

export function filterCexProducts(products: readonly CexProduct[], query: SearchQuery | string): CexProduct[] {
  if (typeof query === 'string') {
    return products.filter((p) => matchesCexQuery(cexInventoryHaystack(p), query));
  }
  const keyword = [query.keyword, query.model, query.manufacturer].filter(Boolean).join(' ');
  return products.filter((p) => {
    if (query.componentType === 'GPU' && p.raw.categoryId && p.raw.categoryId !== CEX_CATEGORIES.gpuPcie.categoryId) {
      return false;
    }
    if (query.componentType === 'CPU' && p.raw.categoryId === CEX_CATEGORIES.gpuPcie.categoryId) {
      return false;
    }
    if (query.maxItemPence && p.sell && p.sell.pence > query.maxItemPence) return false;
    if (query.maxLandedPence && p.sell && p.sell.pence > query.maxLandedPence) return false;
    if (query.vramGb && p.vramGb && p.vramGb !== query.vramGb) return false;
    if (query.excludeTerms) {
      const banned = query.excludeTerms.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
      const hay = cexInventoryHaystack(p);
      if (banned.some((b) => hay.includes(b))) return false;
    }
    return matchesCexQuery(cexInventoryHaystack(p), keyword);
  });
}

export function filterCexDiffs(
  diffs: readonly CexSnapshotDiff[],
  query: string,
  matchingBoxIds?: ReadonlySet<string>,
): CexSnapshotDiff[] {
  if (!query.trim()) return [...diffs];
  const needle = query.trim().toLowerCase();
  return diffs.filter(
    (d) =>
      matchingBoxIds?.has(d.boxId) ||
      d.boxId.toLowerCase().includes(needle) ||
      d.event.toLowerCase().replaceAll('_', ' ').includes(needle),
  );
}
