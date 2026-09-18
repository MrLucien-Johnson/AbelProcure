/**
 * uk.webuy.com search box uses Algolia at search.webuy.io (index prod_cex_uk).
 * That endpoint answers ordinary POSTs (CORS *) even when /boxes is Cloudflare 403.
 * Fuzzy hits are dropped unless they share the query's model numbers / tokens.
 */

import type { CexBox } from './types.ts';
import { parseAlgoliaHit } from './parse.ts';

export function storefrontHitMatchesQuery(title: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = title.toLowerCase();
  const compactHay = hay.replace(/\s+/g, '');
  const compactQ = q.replace(/\s+/g, '');
  if (hay.includes(q) || compactHay.includes(compactQ)) return true;
  const nums = q.match(/\d{3,}/g) ?? [];
  if (nums.length && !nums.every((n) => hay.includes(n))) return false;
  const words = q.split(/\s+/).filter((w) => w.length >= 2 && !/^\d+$/.test(w));
  if (words.length === 0) return nums.length > 0;
  return words.some((w) => hay.includes(w) || compactHay.includes(w.replace(/\s+/g, '')));
}

export function parseStorefrontSearchPayload(
  payload: unknown,
  query = '',
): { boxes: CexBox[]; totalRecords: number | null; page: number | null } {
  if (!payload || typeof payload !== 'object') {
    throw new Error('CeX storefront search payload is not an object');
  }
  const root = payload as { results?: unknown; message?: unknown; hits?: unknown };
  const result = Array.isArray(root.results) ? root.results[0] : payload;
  if (!result || typeof result !== 'object') {
    throw new Error('CeX storefront search returned no result block');
  }
  const block = result as { hits?: unknown; nbHits?: unknown; page?: unknown; message?: unknown };
  if (typeof block.message === 'string' && !Array.isArray(block.hits)) {
    throw new Error(`CeX storefront search error: ${block.message}`);
  }
  const rawHits = Array.isArray(block.hits) ? block.hits : [];
  const boxes = rawHits
    .map((row) => parseAlgoliaHit(row))
    .filter((b): b is CexBox => b !== null)
    .filter((b) => storefrontHitMatchesQuery(b.boxName, query));
  return {
    boxes,
    totalRecords: typeof block.nbHits === 'number' ? block.nbHits : boxes.length,
    page: typeof block.page === 'number' ? block.page : null,
  };
}

export function storefrontSearchParams(opts: {
  q: string;
  categoryIds?: number[];
  page: number;
  count: number;
}): string {
  const params = new URLSearchParams();
  params.set('query', opts.q);
  params.set('hitsPerPage', String(opts.count));
  params.set('page', String(Math.max(0, opts.page)));
  if (opts.categoryIds?.length === 1) {
    params.set('filters', `categoryId:${opts.categoryIds[0]}`);
  } else if (opts.categoryIds && opts.categoryIds.length > 1) {
    params.set('filters', opts.categoryIds.map((id) => `categoryId:${id}`).join(' OR '));
  }
  return params.toString();
}
