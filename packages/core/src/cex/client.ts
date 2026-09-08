/**
 * Conservative CeX UK public JSON client.
 *
 * Hits the same wss2.cex.uk.webuy.io/v3 endpoints the storefront uses.
 * Does NOT bypass Cloudflare, CAPTCHAs, or 403/429. Those become UNAVAILABLE.
 */

import { parseCexBoxesResponse, parseCexCategories, parseCexProductLines } from './parse.ts';
import { DEFAULT_CEX_CONFIG, type CexCollectionState, type CexConfig } from './types.ts';

export interface CexFetchLog {
  url: string;
  status: number;
  ms: number;
  retries: number;
  error?: string;
}

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

export class CexClient {
  readonly config: CexConfig;
  readonly logs: CexFetchLog[] = [];
  lastSuccessAt: string | null = null;
  lastStatus: CexCollectionState = 'UNAVAILABLE';

  constructor(
    config: Partial<CexConfig> = {},
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    this.config = { ...DEFAULT_CEX_CONFIG, ...config };
  }

  private async get(path: string): Promise<{ status: number; text: string }> {
    const url = `${this.config.apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    let lastStatus = 0;
    let lastText = '';
    let lastErr = '';
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      const started = Date.now();
      try {
        const res = await this.fetchImpl(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'User-Agent': this.config.userAgent,
          },
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

  async productLines() {
    const { text } = await this.get('/productlines');
    return parseCexProductLines(text);
  }

  async categories(productLineIds: number[]) {
    const q = encodeURIComponent(JSON.stringify(productLineIds));
    const { text } = await this.get(`/categories?productLineIds=${q}`);
    return parseCexCategories(text);
  }

  async boxesPage(opts: { categoryIds: number[]; firstRecord: number; count: number }) {
    const cats = encodeURIComponent(JSON.stringify(opts.categoryIds));
    const path =
      `/boxes?categoryIds=${cats}` +
      `&firstRecord=${opts.firstRecord}` +
      `&count=${opts.count}` +
      `&sortBy=relevance` +
      `&sortOrder=desc`;
    const { text } = await this.get(path);
    return parseCexBoxesResponse(text);
  }

  async collectBoxes(categoryIds: number[]) {
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
    return merged;
  }
}
