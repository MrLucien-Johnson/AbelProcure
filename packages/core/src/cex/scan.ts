import { alertFromOpportunity, alertFromSnapshotEvent, dedupeAlerts, type CexAlertDraft } from './alerts.ts';
import { CexClient, CexCollectionError, type CexFetchLog } from './client.ts';
import { demoCexProducts } from './provider.ts';
import { boxToProduct } from './normalise.ts';
import { coerceCexImportPayload, parseCexBoxesPayload } from './parse.ts';
import { scoreOpportunity, type CexOpportunity } from './opportunity.ts';
import { InMemorySnapshotStore, snapshotFromProduct } from './snapshots.ts';
import {
  CEX_CATEGORIES,
  DEFAULT_CEX_CONFIG,
  type CexCollectionState,
  type CexConfig,
  type CexProduct,
  type CexSnapshotDiff,
} from './types.ts';
import type { PriceBookEntry } from '../types/listing.ts';
import type { SoldObservation } from './market.ts';

export interface CexScanOptions {
  mode: 'live' | 'demo' | 'import';
  categories?: 'gpu' | 'all';
  payload?: unknown;
  config?: Partial<CexConfig>;
  client?: CexClient;
  store?: InMemorySnapshotStore;
  priceBook?: readonly PriceBookEntry[];
  sold?: readonly SoldObservation[];
  allowDemoMarket?: boolean;
  existingAlertKeys?: Set<string>;
  collectedAt?: string;
}

export interface CexScanResult {
  status: CexCollectionState;
  lastSuccessAt: string | null;
  products: CexProduct[];
  diffs: CexSnapshotDiff[];
  opportunities: CexOpportunity[];
  alerts: CexAlertDraft[];
  pages: number;
  parseFailures: number;
  logs: CexFetchLog[];
  error?: string;
}

function categoryIds(which: 'gpu' | 'all' = 'gpu'): number[] {
  if (which === 'all') {
    return [
      CEX_CATEGORIES.gpuPcie.categoryId,
      CEX_CATEGORIES.amdCpu.categoryId,
      CEX_CATEGORIES.intelCpu.categoryId,
    ];
  }
  return [CEX_CATEGORIES.gpuPcie.categoryId];
}

export async function runCexScan(opts: CexScanOptions): Promise<CexScanResult> {
  const config: CexConfig = { ...DEFAULT_CEX_CONFIG, ...opts.config };
  const store = opts.store ?? new InMemorySnapshotStore();
  const collectedAt = opts.collectedAt ?? new Date().toISOString();
  const logs: CexFetchLog[] = [];
  let status: CexCollectionState = 'UNAVAILABLE';
  let lastSuccessAt: string | null = null;
  let products: CexProduct[] = [];
  let pages = 0;
  const parseFailures = 0;
  let error: string | undefined;

  console.info('[cex] collection start', { mode: opts.mode, categories: opts.categories ?? 'gpu' });

  try {
    if (opts.mode === 'demo') {
      products = demoCexProducts(collectedAt);
      status = 'CACHED';
      lastSuccessAt = collectedAt;
      pages = 1;
    } else if (opts.mode === 'import') {
      if (opts.payload === undefined) throw new Error('import mode requires payload');
      const parsed = parseCexBoxesPayload(coerceCexImportPayload(opts.payload));
      products = parsed.boxes.map((box) =>
        boxToProduct(box, {
          collectedAt,
          dataSource: 'CEX_IMPORT',
          collectionState: 'LIVE',
          storefront: config.storefrontBaseUrl,
        }),
      );
      status = 'LIVE';
      lastSuccessAt = collectedAt;
      pages = 1;
    } else {
      if (!config.enabled) {
        status = 'DISABLED';
        throw new CexCollectionError('CEX_ENABLED=false', 'DISABLED');
      }
      const client = opts.client ?? new CexClient(config);
      const page = await client.collectBoxes(categoryIds(opts.categories));
      logs.push(...client.logs);
      pages = Math.max(1, Math.ceil(page.boxes.length / Math.max(config.pageSize, 1)));
      products = page.boxes.map((box) =>
        boxToProduct(box, {
          collectedAt,
          dataSource: 'CEX_WEBUY_API',
          collectionState: 'LIVE',
          storefront: config.storefrontBaseUrl,
        }),
      );
      status = client.lastStatus;
      lastSuccessAt = client.lastSuccessAt;
    }
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
    if (err instanceof CexCollectionError) status = err.status;
    else status = 'UNAVAILABLE';
    console.warn('[cex] collection failed', { error, status });
  }

  const diffs = products.map((p) => store.apply(snapshotFromProduct(p)));
  const gpuProducts = products.filter((p) => p.raw.categoryId === CEX_CATEGORIES.gpuPcie.categoryId || p.modelKey);
  const opportunities = gpuProducts
    .filter((p) => p.raw.categoryId !== CEX_CATEGORIES.amdCpu.categoryId && p.raw.categoryId !== CEX_CATEGORIES.intelCpu.categoryId)
    .map((p) =>
      scoreOpportunity(p, {
        priceBook: opts.priceBook,
        sold: opts.sold,
        allowDemoMarket: opts.allowDemoMarket ?? opts.mode === 'demo',
      }),
    )
    .sort((a, b) => b.score - a.score);

  const incoming: CexAlertDraft[] = [];
  for (const opp of opportunities) {
    const a = alertFromOpportunity(opp, collectedAt);
    if (a) incoming.push(a);
  }
  for (const diff of diffs) {
    const product = products.find((p) => p.boxId === diff.boxId);
    const a = alertFromSnapshotEvent(diff, product?.title ?? diff.boxId, product?.productUrl ?? null, collectedAt);
    if (a) incoming.push(a);
  }
  const alerts = dedupeAlerts(opts.existingAlertKeys ?? new Set(), incoming);

  console.info('[cex] collection end', {
    status,
    products: products.length,
    new: diffs.filter((d) => d.event === 'NEW').length,
    changed: diffs.filter((d) => d.event !== 'UNCHANGED' && d.event !== 'NEW').length,
    opportunities: opportunities.length,
    alerts: alerts.length,
    pages,
    parseFailures,
  });

  return { status, lastSuccessAt, products, diffs, opportunities, alerts, pages, parseFailures, logs, error };
}
