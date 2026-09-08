import { Hono } from 'hono';
import { DEMO_CEX_BOXES_RESPONSE, runCexScan, cexConfigFromEnv } from '@abelprocure/core';
import type { Env } from '../env.ts';
import { persistCexScan, runWorkerCexScan } from './scanJob.ts';

export function cexRoutes() {
  const app = new Hono<{ Bindings: Env }>();

  app.get('/api/cex/status', (c) => {
    const cfg = cexConfigFromEnv(c.env as unknown as Record<string, string | undefined>);
    return c.json({
      enabled: cfg.enabled,
      baseUrl: cfg.apiBaseUrl,
      CEX_COLLECTION: cfg.enabled ? 'CONFIGURATION_REQUIRED' : 'DISABLED',
      note: 'Live /boxes may be Cloudflare 403; taxonomy endpoints often work. Failure here does not affect eBay.',
    });
  });

  app.get('/api/cex/gpus', async (c) => {
    const demo = c.req.query('demo') === '1' || !cexConfigFromEnv(c.env as unknown as Record<string, string | undefined>).enabled;
    const result = demo
      ? await runCexScan({ mode: 'demo', categories: 'gpu', allowDemoMarket: true })
      : await runWorkerCexScan(c.env, 'gpu');
    return c.json({
      collectionState: result.status,
      lastSuccessAt: result.lastSuccessAt,
      stale: result.status === 'STALE' || result.status === 'UNAVAILABLE',
      error: result.error ?? null,
      products: result.products,
      opportunities: result.opportunities,
      diffs: result.diffs,
    });
  });

  app.post('/api/cex/scan', async (c) => {
    const body = await c.req.json().catch(() => ({} as Record<string, unknown>));
    const categories = body.categories === 'all' ? 'all' : 'gpu';
    if (body.mode === 'import' && body.payload) {
      const result = await runCexScan({
        mode: 'import',
        payload: body.payload,
        categories,
        allowDemoMarket: false,
      });
      if (c.env.DB) await persistCexScan(c.env.DB, result).catch(() => undefined);
      return c.json(result);
    }
    if (body.mode === 'demo') {
      return c.json(await runCexScan({ mode: 'demo', categories, allowDemoMarket: true, payload: DEMO_CEX_BOXES_RESPONSE }));
    }
    const result = await runWorkerCexScan(c.env, categories);
    return c.json(result);
  });

  app.post('/internal/cex-scan', async (c) => {
    const key = c.req.header('x-cron-key');
    if (c.env.WEBHOOK_VERIFICATION_TOKEN && key !== c.env.WEBHOOK_VERIFICATION_TOKEN) {
      return c.json({ error: 'unauthorized' }, 401);
    }
    try {
      const result = await runWorkerCexScan(c.env, 'gpu');
      return c.json({ ran: true, status: result.status, products: result.products.length, error: result.error ?? null });
    } catch (err) {
      console.warn('[cex] isolated scan failed', err instanceof Error ? err.message : err);
      return c.json({ ran: false, status: 'UNAVAILABLE', error: err instanceof Error ? err.message : String(err) }, 200);
    }
  });

  return app;
}
