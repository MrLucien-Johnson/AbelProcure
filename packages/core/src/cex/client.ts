/**
 * Conservative CeX UK public JSON client.
 *
 * Inventory dump: wss2.cex.uk.webuy.io/v3/boxes (often Cloudflare 403 from datacentres).
 * Website search: search.webuy.io Algolia index prod_cex_uk (same request uk.webuy.com makes).
 * Does NOT bypass Cloudflare, CAPTCHAs, or 403/429. Those become UNAVAILABLE.
 */

import { parseCexBoxesResponse, parseCexCategories, parseCexProductLines } from './parse.ts';
import { parseStorefrontSearchPayload, storefrontSearchParams } from './storefront.ts';
import { DEFAULT_CEX_CONFIG, type CexCollectionState, type CexConfig } from './types.ts';

export interface CexFetchLog {
  url: string;
  status: number;
  ms: number;
  retries: number;
  error?: string;
}

export type CexLiveChannel = 'BOXES' | 'STOREFRONT_SEARCH';

export class CexCollectionError extends Error {
  constructor(
    message: string,
    readonly status: CexCollectionState,
    readonly httpStatus?: number,
  ) {
    super(message);
    this.name = 'CexCollectionError';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function inBrowser(): boolean {
  return typeof globalThis !== 'undefined' && 'document' in globalThis && 'window' in globalThis;
}

export class CexClient {
  readonly config: CexConfig;
  readonly logs: CexFetchLog[] = [];
  lastSuccessAt: string | null = null;
  lastStatus: CexCollectionState = 'UNAVAILABLE';
  lastChannel: CexLiveChannel | null = null;

  constructor(
    config: Partial<CexConfig> = {},
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    this.config = { ...DEFAULT_CEX_CONFIG, ...config };
  }

  private headers(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = { Accept: 'application/json', ...extra };
    if (!inBrowser()) headers['User-Agent'] = this.config.userAgent;
    return headers;
  }

  private async request(url: string, init: RequestInit = {}): Promise<{ status: number; text: string }> {
    let lastStatus = 0;
    let lastText = '';
    let lastErr = '';
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      const started = Date.now();
      try {
        const res = await this.fetchImpl(url, {
          ...init,
          headers: this.headers(init.headers as Record<string, string> | undefined),
          signal: AbortSignal.timeout(this.config.requestTimeoutMs),
        });
        lastStatus = res.status;
        lastText = await res.text();
        this.logs.push({
          url,
          status: res.status,
          ms: Date.now() - started,
          retries: attempt,
        });
        if (res.status === 403 || res.status === 401) {
          this.lastStatus = 'UNAVAILABLE';
          throw new CexCollectionError(
            `CeX blocked automated collection (HTTP ${res.status}). Not retrying with evasion.`,
            'UNAVAILABLE',
            res.status,
          );
        }
        if (res.status === 429) {
          this.lastStatus = 'UNAVAILABLE';
          throw new CexCollectionError('CeX rate-limited the client (HTTP 429). Backing off.', 'UNAVAILABLE', 429);
        }
        if (res.status >= 500 && attempt < this.config.maxRetries) {
          await sleep(this.config.requestDelayMs * (attempt + 1));
          continue;
        }
        if (!res.ok) {
          this.lastStatus = 'UNAVAILABLE';
          throw new CexCollectionError(`CeX HTTP ${res.status}`, 'UNAVAILABLE', res.status);
        }
        this.lastStatus = 'LIVE';
        this.lastSuccessAt = new Date().toISOString();
        return { status: res.status, text: lastText };
      } catch (err) {
        if (err instanceof CexCollectionError) throw err;
        lastErr = err instanceof Error ? err.message : String(err);
        this.logs.push({
          url,
          status: lastStatus,
          ms: Date.now() - started,
          retries: attempt,
          error: lastErr,
        });
        if (attempt >= this.config.maxRetries) {
          this.lastStatus = 'UNAVAILABLE';
          throw new CexCollectionError(`CeX request failed: ${lastErr}`, 'UNAVAILABLE');
        }
        await sleep(this.config.requestDelayMs * (attempt + 1));
      }
    }
    this.lastStatus = 'UNAVAILABLE';
    throw new CexCollectionError(`CeX request failed: ${lastErr || lastText}`, 'UNAVAILABLE', lastStatus);
  }

  private async get(path: string): Promise<{ status: number; text: string }> {
    const url = `${this.config.apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    return this.request(url, { method: 'GET' });
  }

  async productLines() {
    const { text } = await this.get('/productlines');
    return parseCexProductLines(text);
  }

  async categories(productLineIds: number[]) {
    const q = encodeURIComponent(JSON.stringify(productLineIds));
    const { text } = await this.get(`/categories?productLineIds=${q}`);
    return parseCexCategories(text);
  }

  async boxesPage(opts: { categoryIds?: number[]; q?: string; firstRecord: number; count: number }) {
    const params = new URLSearchParams();
    if (opts.categoryIds?.length) params.set('categoryIds', JSON.stringify(opts.categoryIds));
    if (opts.q?.trim()) params.set('q', opts.q.trim());
    params.set('firstRecord', String(opts.firstRecord));
    params.set('count', String(opts.count));
    params.set('sortBy', 'relevance');
    params.set('sortOrder', 'desc');
    const { text } = await this.get(`/boxes?${params.toString()}`);
    return parseCexBoxesResponse(text);
  }

  async collectBoxes(categoryIds: number[], q?: string) {
    if (!this.config.enabled) {
      throw new CexCollectionError('CEX_ENABLED=false', 'DISABLED');
    }
    const merged = {
      ack: 'Success',
      boxes: [] as ReturnType<typeof parseCexBoxesResponse>['boxes'],
      totalRecords: 0 as number | null,
      firstRecord: 1 as number | null,
      count: this.config.pageSize as number | null,
    };
    let first = 1;
    for (let page = 0; page < this.config.maxPagesPerRun; page++) {
      if (page > 0) await sleep(this.config.requestDelayMs);
      const chunk = await this.boxesPage({
        categoryIds,
        q,
        firstRecord: first,
        count: this.config.pageSize,
      });
      merged.ack = chunk.ack;
      merged.boxes.push(...chunk.boxes);
      merged.totalRecords = chunk.totalRecords;
      if (chunk.boxes.length === 0) break;
      if (chunk.totalRecords !== null && merged.boxes.length >= chunk.totalRecords) break;
      first += this.config.pageSize;
    }
    this.lastChannel = 'BOXES';
    return merged;
  }

  /** Same POST the uk.webuy.com search box sends to Algolia. */
  async storefrontSearchPage(opts: { q: string; categoryIds?: number[]; page: number; count: number }) {
    if (!this.config.enabled) {
      throw new CexCollectionError('CEX_ENABLED=false', 'DISABLED');
    }
    const url = `${this.config.searchApiUrl.replace(/\/$/, '')}/1/indexes/*/queries`;
    const body = JSON.stringify({
      requests: [
        {
          indexName: this.config.searchIndex,
          params: storefrontSearchParams(opts),
        },
      ],
    });
    const { text } = await this.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    let json: unknown;
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      throw new CexCollectionError('CeX storefront search response is not JSON', 'UNAVAILABLE');
    }
    return parseStorefrontSearchPayload(json, opts.q);
  }

  async collectStorefront(opts: { q: string; categoryIds?: number[] }) {
    if (!this.config.enabled) {
      throw new CexCollectionError('CEX_ENABLED=false', 'DISABLED');
    }
    const merged = {
      ack: 'Success',
      boxes: [] as ReturnType<typeof parseCexBoxesResponse>['boxes'],
      totalRecords: 0 as number | null,
      firstRecord: 1 as number | null,
      count: this.config.pageSize as number | null,
    };
    const maxPages = opts.q.trim() ? Math.min(4, this.config.maxPagesPerRun) : this.config.maxPagesPerRun;
    for (let page = 0; page < maxPages; page++) {
      if (page > 0) await sleep(this.config.requestDelayMs);
      const chunk = await this.storefrontSearchPage({
        q: opts.q,
        categoryIds: opts.categoryIds,
        page,
        count: this.config.pageSize,
      });
      merged.boxes.push(...chunk.boxes);
      merged.totalRecords = chunk.totalRecords;
      merged.count = this.config.pageSize;
      if (chunk.boxes.length === 0) break;
      if (chunk.totalRecords !== null && (page + 1) * this.config.pageSize >= chunk.totalRecords) break;
    }
    this.lastChannel = 'STOREFRONT_SEARCH';
    this.lastStatus = 'LIVE';
    this.lastSuccessAt = this.lastSuccessAt ?? new Date().toISOString();
    return merged;
  }

  /**
   * Keyword search uses the storefront index (what the website search box uses).
   * Category dump tries /boxes, then falls back to the storefront index on 403.
   */
  async collectLive(opts: { categoryIds: number[]; q?: string }) {
    const q = opts.q?.trim() ?? '';
    if (q) {
      return this.collectStorefront({ q, categoryIds: opts.categoryIds });
    }
    try {
      return await this.collectBoxes(opts.categoryIds);
    } catch (err) {
      if (err instanceof CexCollectionError && err.httpStatus === 403) {
        return this.collectStorefront({ q: '', categoryIds: opts.categoryIds });
      }
      throw err;
    }
  }
}
