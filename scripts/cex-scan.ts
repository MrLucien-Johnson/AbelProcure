/**
 * Standalone CeX scanner. Does not require the eBay Worker.
 *
 *   npm run cex:scan            # live GPU scan (fails gracefully on 403)
 *   npm run cex:scan:gpu        # same
 *   npm run cex:scan:all        # GPU + CPU categories
 *   npm run cex:scan:demo       # labelled DEMO_SYNTHETIC fixtures
 *   npm run cex:import -- file.json
 *   npm run cex:opportunities   # demo scoring including Build 4
 */

import { readFileSync } from 'node:fs';
import { cexConfigFromEnv, runCexScan, formatGBP } from '@abelprocure/core';

const args = process.argv.slice(2);
const modeArg = args.find((a) => a.startsWith('--mode='))?.slice('--mode='.length);
const importFile = args.find((a) => a.startsWith('--import='))?.slice('--import='.length);
const categories = args.includes('--all') ? 'all' : 'gpu';

const mode = importFile ? 'import' : modeArg === 'demo' ? 'demo' : modeArg === 'import' ? 'import' : 'live';

const payload = importFile ? JSON.parse(readFileSync(importFile, 'utf8')) : undefined;

const result = await runCexScan({
  mode,
  categories,
  payload,
  config: cexConfigFromEnv(process.env),
  allowDemoMarket: mode === 'demo',
});

console.info(
  JSON.stringify(
    {
      status: result.status,
      lastSuccessAt: result.lastSuccessAt,
      error: result.error ?? null,
      products: result.products.length,
      gpus: result.opportunities.length,
      alerts: result.alerts.length,
      pages: result.pages,
      top: result.opportunities.slice(0, 8).map((o) => ({
        title: o.product.title,
        url: o.product.productUrl,
        cex: o.product.sell ? formatGBP(o.product.sell) : null,
        decision: o.decision,
        net: o.profit.net ? formatGBP(o.profit.net) : null,
        maxBuy: formatGBP({ pence: o.maxBuyPence, currency: 'GBP' }),
        beats1080: o.beatsGtx1080Benchmark,
        psu: o.profit.psu,
        cpu: o.profit.cpuBalance,
      })),
    },
    null,
    2,
  ),
);

if (result.status === 'UNAVAILABLE') process.exitCode = 0;
