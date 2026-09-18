import {
  CEX_CATEGORIES,
  cexConfigFromEnv,
  runCexScan,
  type CexScanResult,
} from '@abelprocure/core';
import type { Env } from '../env.ts';

export async function persistCexScan(db: D1Database, result: CexScanResult): Promise<void> {
  const runId = crypto.randomUUID();
  const finished = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO cex_runs (id, started_at, finished_at, status, collection_state, product_count, new_count, changed_count, pages, error, last_success_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      runId,
      finished,
      finished,
      result.error ? 'error' : 'ok',
      result.status,
      result.products.length,
      result.diffs.filter((d) => d.event === 'NEW').length,
      result.diffs.filter((d) => d.event !== 'UNCHANGED' && d.event !== 'NEW').length,
      result.pages,
      result.error ?? null,
      result.lastSuccessAt,
    )
    .run();

  for (const product of result.products) {
    await db
      .prepare(
        `INSERT INTO cex_products (box_id, title, model_key, normalised_model, manufacturer, family, variant, vram_gb, memory_type, product_url, image_url, category_id, first_seen_at, last_seen_at, data_source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(box_id) DO UPDATE SET
           title=excluded.title,
           model_key=excluded.model_key,
           normalised_model=excluded.normalised_model,
           manufacturer=excluded.manufacturer,
           last_seen_at=excluded.last_seen_at,
           product_url=excluded.product_url`,
      )
      .bind(
        product.boxId,
        product.title,
        product.modelKey,
        product.normalisedModel,
        product.manufacturer,
        product.family,
        product.variant,
        product.vramGb,
        product.memoryType,
        product.productUrl,
        product.imageUrl,
        product.raw.categoryId,
        product.collectedAt,
        product.collectedAt,
        product.dataSource,
      )
      .run();
  }

  for (const diff of result.diffs) {
    const product = result.products.find((p) => p.boxId === diff.boxId);
    if (!product) continue;
    await db
      .prepare(
        `INSERT OR IGNORE INTO cex_snapshots (id, box_id, observed_at, sell_pence, cash_pence, voucher_pence, out_of_stock, ecom_quantity, event)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        diff.boxId,
        product.collectedAt,
        product.sell?.pence ?? null,
        product.cash?.pence ?? null,
        product.voucher?.pence ?? null,
        product.availability === 'OUT_OF_STOCK' ? 1 : 0,
        product.ecomQuantity,
        diff.event,
      )
      .run();
  }
}

export async function runWorkerCexScan(env: Env, mode: 'gpu' | 'all' | 'demo' = 'gpu', query?: string): Promise<CexScanResult> {
  const config = cexConfigFromEnv(env as unknown as Record<string, string | undefined>);
  const result = await runCexScan({
    mode: config.enabled ? 'live' : 'demo',
    categories: mode === 'all' ? 'all' : 'gpu',
    query,
    config,
    allowDemoMarket: false,
  });
  if (env.DB && result.products.length) {
    try {
      await persistCexScan(env.DB, result);
    } catch (err) {
      console.warn('[cex] persist failed', err instanceof Error ? err.message : err);
    }
  }
  return result;
}

export function cexStatusPayload(result: CexScanResult | null) {
  return {
    CEX_COLLECTION: result?.status ?? 'UNAVAILABLE',
    lastSuccessAt: result?.lastSuccessAt ?? null,
    productCount: result?.products.length ?? 0,
    gpuCategoryId: CEX_CATEGORIES.gpuPcie.categoryId,
    error: result?.error ?? null,
  };
}
