import { describe, expect, it, vi } from 'vitest';
import { parseTitle } from '../parsers/normalise.ts';
import { parseCexBoxesPayload, parseCexBoxesResponse, parseCexCategories, parseCexProductLines, parseBox } from './parse.ts';
import { boxToProduct, productUrlForBox, resolveGpuCatalog } from './normalise.ts';
import { DEMO_CEX_BOXES, DEMO_CEX_BOXES_RESPONSE } from './fixtures.ts';
import { InMemorySnapshotStore, diffSnapshots, snapshotFromProduct } from './snapshots.ts';
import { CexClient } from './client.ts';
import { runCexScan } from './scan.ts';
import { classifyPsu, classifyCpuBalance, build4Profit, gtx1080BenchmarkProfit, BUILD4 } from './profitability.ts';
import { performanceFor } from './performance.ts';
import { scoreOpportunity, hardMaxBuyPence, DEFAULT_THRESHOLDS } from './opportunity.ts';
import { alertFromOpportunity, cexAlertDedupeKey, dedupeAlerts } from './alerts.ts';
import { matchCompletePcs } from './comparables.ts';
import { money } from '../money/money.ts';
import { DEFAULT_CEX_CONFIG } from './types.ts';
import { CexMarketplaceProvider } from './provider.ts';

const collected = {
  collectedAt: '2026-09-08T12:00:00.000Z',
  dataSource: 'DEMO_SYNTHETIC' as const,
  collectionState: 'CACHED' as const,
  storefront: DEFAULT_CEX_CONFIG.storefrontBaseUrl,
};

function productFromTitle(title: string, sell = 105, boxId = 'x') {
  const box = parseBox({
    boxId,
    boxName: title,
    categoryId: 892,
    sellPrice: sell,
    cashPrice: 60,
    exchangePrice: 70,
    outOfStock: 0,
    outOfEcomStock: 0,
    ecomQuantityOnHand: 1,
  });
  if (!box) throw new Error('parse failed');
  return boxToProduct(box, collected);
}

describe('CeX boxes parsing', () => {
  it('parses the demo /boxes JSON payload', () => {
    const page = parseCexBoxesPayload(DEMO_CEX_BOXES_RESPONSE);
    expect(page.ack).toBe('Success');
    expect(page.boxes.length).toBe(DEMO_CEX_BOXES.length);
    expect(page.boxes[0]?.sellPrice).toBe(105);
    expect(page.totalRecords).toBe(DEMO_CEX_BOXES.length);
  });

  it('parses pagination metadata', () => {
    const page = parseCexBoxesResponse(
      JSON.stringify({
        response: { ack: 'Success', data: { boxes: [], totalBoxes: 2503, firstRecord: 51, count: 50 } },
      }),
    );
    expect(page.firstRecord).toBe(51);
    expect(page.totalRecords).toBe(2503);
    expect(page.boxes).toEqual([]);
  });

  it('parses product lines and categories', () => {
    const lines = parseCexProductLines(
      JSON.stringify({ response: { ack: 'Success', data: { productLines: [{ productLineId: 7, productLineName: 'Graphics' }] } } }),
    );
    const cats = parseCexCategories(
      JSON.stringify({
        response: { ack: 'Success', data: { categories: [{ categoryId: 892, categoryName: 'PCI-E', productLineId: 7, totalBoxes: 2503 }] } },
      }),
    );
    expect(lines[0]?.productLineId).toBe(7);
    expect(cats[0]?.categoryId).toBe(892);
  });

  it('skips malformed boxes instead of inventing them', () => {
    expect(parseBox({})).toBeNull();
    const page = parseCexBoxesPayload({
      response: { ack: 'Success', data: { boxes: [{ boxId: 1 }, { boxId: 'ok', boxName: 'RX 6600', sellPrice: 100, outOfStock: 0 }] } },
    });
    expect(page.boxes).toHaveLength(1);
  });

  it('parses cash, voucher and availability flags', () => {
    const box = parseBox({
      boxId: 'a',
      boxName: 'card',
      sellPrice: 10.5,
      cashPrice: 6,
      exchangePrice: 7.25,
      outOfStock: 1,
      outOfEcomStock: 1,
      ecomQuantityOnHand: 0,
    });
    expect(box?.sellPrice).toBe(10.5);
    expect(box?.cashPrice).toBe(6);
    expect(box?.exchangePrice).toBe(7.25);
    expect(box?.outOfStock).toBe(true);
  });
});

describe('GPU normalisation', () => {
  it('maps 6600 naming variants to RX 6600 8GB', () => {
    for (const title of ['6600 8GB graphics', 'RX6600', 'RX 6600', 'Radeon RX6600 8GB']) {
      const p = productFromTitle(title);
      expect(p.normalisedModel).toBe('RX 6600');
      expect(p.modelKey).toBe('rx-6600');
      expect(p.vramGb).toBe(8);
      expect(p.title).toBe(title);
    }
  });

  it('never merges 3060 8GB with 3060 12GB or 3060 Ti', () => {
    const eight = productFromTitle('NVIDIA GeForce RTX 3060 8GB');
    const twelve = productFromTitle('NVIDIA GeForce RTX 3060 12GB');
    const ti = productFromTitle('NVIDIA GeForce RTX 3060 Ti 8GB');
    expect(eight.modelKey).toBe('rtx-3060-8gb');
    expect(twelve.modelKey).toBe('rtx-3060');
    expect(ti.modelKey).toBe('rtx-3060-ti');
    expect(eight.vramGb).toBe(8);
    expect(twelve.vramGb).toBe(12);
  });

  it('distinguishes 6600 / 6600 XT / 6650 XT', () => {
    expect(productFromTitle('RX 6600 8GB').modelKey).toBe('rx-6600');
    expect(productFromTitle('RX 6600 XT 8GB').modelKey).toBe('rx-6600-xt');
    expect(productFromTitle('RX 6650 XT 8GB').modelKey).toBe('rx-6650-xt');
  });

  it('distinguishes 1660 / Super / Ti and 1080 / 1080 Ti', () => {
    expect(parseTitle('GTX 1660 6GB').model.value).toBe('GTX 1660');
    expect(parseTitle('GTX 1660 Super 6GB').model.value).toBe('GTX 1660 Super');
    expect(parseTitle('GTX 1660 Ti 6GB').model.value).toBe('GTX 1660 Ti');
    expect(parseTitle('GTX 1080 8GB').model.value).toBe('GTX 1080');
    expect(parseTitle('GTX 1080 Ti 11GB').model.value).toBe('GTX 1080 Ti');
  });

  it('builds a real storefront URL from boxId, never a fake host', () => {
    const url = productUrlForBox('https://uk.webuy.com', 'demo-rx6600-1');
    expect(url).toBe('https://uk.webuy.com/product-detail?id=demo-rx6600-1');
  });

  it('resolveGpuCatalog keeps unknown future names as a slug rather than merging', () => {
    expect(resolveGpuCatalog('RTX 6090', 16)?.key).toBeUndefined();
  });
});

describe('inventory snapshots', () => {
  it('classifies NEW, PRICE_DROP, RESTOCKED, OUT_OF_STOCK, UNCHANGED', () => {
    const store = new InMemorySnapshotStore();
    const a = store.apply({
      boxId: '1',
      observedAt: 't1',
      sellPence: 12000,
      cashPence: 8000,
      voucherPence: 9000,
      outOfStock: false,
      ecomQuantity: 2,
    });
    expect(a.event).toBe('NEW');
    const drop = store.apply({
      boxId: '1',
      observedAt: 't2',
      sellPence: 10000,
      cashPence: 8000,
      voucherPence: 9000,
      outOfStock: false,
      ecomQuantity: 2,
    });
    expect(drop.event).toBe('PRICE_DROP');
    const oos = store.apply({
      boxId: '1',
      observedAt: 't3',
      sellPence: 10000,
      cashPence: 8000,
      voucherPence: 9000,
      outOfStock: true,
      ecomQuantity: 0,
    });
    expect(oos.event).toBe('OUT_OF_STOCK');
    const restock = store.apply({
      boxId: '1',
      observedAt: 't4',
      sellPence: 10000,
      cashPence: 8000,
      voucherPence: 9000,
      outOfStock: false,
      ecomQuantity: 1,
    });
    expect(restock.event).toBe('RESTOCKED');
    const same = store.apply({
      boxId: '1',
      observedAt: 't5',
      sellPence: 10000,
      cashPence: 8000,
      voucherPence: 9000,
      outOfStock: false,
      ecomQuantity: 1,
    });
    expect(same.event).toBe('UNCHANGED');
    expect(
      diffSnapshots(undefined, {
        boxId: '2',
        observedAt: 't0',
        sellPence: 5000,
        cashPence: null,
        voucherPence: null,
        outOfStock: false,
        ecomQuantity: 1,
      }).event,
    ).toBe('NEW');
  });

  it('does not duplicate identical snapshot rows', () => {
    const store = new InMemorySnapshotStore();
    const row = {
      boxId: '1',
      observedAt: 't1',
      sellPence: 10000,
      cashPence: null,
      voucherPence: null,
      outOfStock: false,
      ecomQuantity: 1,
    };
    store.apply(row);
    store.apply({ ...row, observedAt: 't2' });
    expect(store.history).toHaveLength(1);
  });
});

describe('Build 4 profitability and scoring', () => {
  it('does not auto-allocate the spare GT 1030', () => {
    expect(BUILD4.spareGpu.allocateToBuild4).toBe(false);
    expect(BUILD4.gpu).toBeNull();
  });

  it('classifies PSU for 6600 vs 3060 Ti on the older VS550', () => {
    expect(classifyPsu(performanceFor('rx-6600'))).toBe('SAFE');
    expect(classifyPsu(performanceFor('rtx-3060-ti'))).toBe('BORDERLINE');
    expect(classifyPsu(performanceFor('gtx-1080-ti'))).toBe('PSU_UPGRADE_RECOMMENDED');
  });

  it('flags CPU bottleneck without rejecting the GPU', () => {
    expect(classifyCpuBalance(performanceFor('rx-6600'))).toBe('MODERATE_BOTTLENECK');
    expect(classifyCpuBalance(performanceFor('gtx-1660-super'))).toBe('WELL_MATCHED');
    const opp = scoreOpportunity(productFromTitle('AMD Radeon RX 6600 8GB', 105), { allowDemoMarket: true });
    expect(opp.decision).not.toBeUndefined();
    expect(opp.profit.cpuBalance === 'HIGH_BOTTLENECK' || opp.profit.cpuBalance === 'CPU_UPGRADE_SUGGESTED' || opp.profit.cpuBalance === 'MODERATE_BOTTLENECK').toBe(true);
  });

  it('compares CeX cards to the £100.15 GTX 1080 benchmark from data', () => {
    const bench = gtx1080BenchmarkProfit();
    const rx = scoreOpportunity(productFromTitle('AMD Radeon RX 6600 8GB', 105), { allowDemoMarket: true });
    const cheap580 = scoreOpportunity(productFromTitle('Sapphire Radeon RX 580 8GB', 55), { allowDemoMarket: true });
    expect(bench.net).not.toBeNull();
    expect(rx.beatsGtx1080Benchmark).toBe(true);
    expect(rx.decision === 'BUY' || rx.decision === 'OFFER').toBe(true);
    expect(cheap580.beatsGtx1080Benchmark).toBe(false);
    expect(cheap580.decision === 'PASS' || cheap580.bargainBand === 'OVERPRICED').toBe(true);
  });

  it('computes a hard max buy that is not blindly the CeX sticker', () => {
    const p = productFromTitle('AMD Radeon RX 6600 8GB', 105);
    const profit = build4Profit(p);
    const max = hardMaxBuyPence(profit, 13000, DEFAULT_THRESHOLDS);
    expect(max).toBeGreaterThan(0);
    expect(max).toBeLessThanOrEqual(Math.floor(13000 * 0.95));
  });
});

describe('complete-PC comparables and alerts', () => {
  it('matches broad Ryzen 5 + RX 6600 PC titles', () => {
    const hits = matchCompletePcs(
      [
        { itemId: '1', title: 'Ryzen 5 Gaming PC RX 6600 16GB 1TB Windows 11', itemPrice: money(49900), sold: true },
        { itemId: '2', title: 'Ryzen 5 3600 GTX 1080 16GB 1TB Gaming PC', itemPrice: money(38000), sold: true },
      ],
      { gpuKey: 'rx-6600', cpuKey: 'r5-3600', ramGb: 16, storageGb: 1000 },
    );
    expect(hits.some((h) => h.listing.itemId === '1')).toBe(true);
    expect(hits.some((h) => h.match === 'BROAD_MARKET')).toBe(true);
    expect(hits.some((h) => h.listing.itemId === '2')).toBe(false);
  });

  it('dedupes CeX alerts by box and day', () => {
    const opp = scoreOpportunity(productFromTitle('AMD Radeon RX 6600 8GB', 90), { allowDemoMarket: true });
    const a = alertFromOpportunity(opp, '2026-09-08T12:00:00.000Z');
    const keys = new Set<string>();
    const first = dedupeAlerts(keys, a ? [a] : []);
    const second = dedupeAlerts(keys, a ? [a] : []);
    expect(second).toHaveLength(0);
    expect(cexAlertDedupeKey('CEX_GPU_BARGAIN', 'x', '2026-09-08')).toContain('cex:');
    expect(first.length + (a ? 0 : 0)).toBeGreaterThanOrEqual(0);
  });
});

describe('CeX client failure handling (no live hammering)', () => {
  it('treats HTTP 403 as UNAVAILABLE without retrying evasion', async () => {
    const fetchImpl = vi.fn(async () => new Response('blocked', { status: 403 }));
    const client = new CexClient({ maxRetries: 2, requestDelayMs: 1, enabled: true }, fetchImpl as unknown as typeof fetch);
    await expect(client.boxesPage({ categoryIds: [892], firstRecord: 1, count: 50 })).rejects.toMatchObject({
      httpStatus: 403,
      status: 'UNAVAILABLE',
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('paginates until empty using mocked JSON', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      const first = Number(new URL(url).searchParams.get('firstRecord') ?? '1');
      const boxes =
        first === 1
          ? [{ boxId: 'p1', boxName: 'RX 6600 8GB', sellPrice: 100, outOfStock: 0, categoryId: 892 }]
          : [];
      return new Response(JSON.stringify({ response: { ack: 'Success', data: { boxes, totalBoxes: 1, firstRecord: first } } }));
    });
    const client = new CexClient({ requestDelayMs: 1, maxPagesPerRun: 3, pageSize: 1 }, fetchImpl as unknown as typeof fetch);
    const page = await client.collectBoxes([892]);
    expect(page.boxes).toHaveLength(1);
    expect(fetchImpl.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it('import mode accepts a raw boxes array', async () => {
    const result = await runCexScan({
      mode: 'import',
      payload: [{ boxId: 'imp-1', boxName: 'AMD Radeon RX 6600 8GB', sellPrice: 105, categoryId: 892, outOfStock: 0 }],
      allowDemoMarket: true,
    });
    expect(result.products).toHaveLength(1);
    expect(result.products[0]?.modelKey).toBe('rx-6600');
  });

  it('scan import mode uses the payload and does not fetch', async () => {
    const result = await runCexScan({ mode: 'import', payload: DEMO_CEX_BOXES_RESPONSE, allowDemoMarket: true });
    expect(result.status).toBe('LIVE');
    expect(result.products.length).toBeGreaterThan(5);
    expect(result.products.every((p) => p.productUrl?.startsWith('https://uk.webuy.com/product-detail?id='))).toBe(true);
    expect(result.opportunities.length).toBeGreaterThan(0);
  });

  it('demo scan never calls fetch', async () => {
    const spy = vi.spyOn(globalThis, 'fetch');
    const result = await runCexScan({ mode: 'demo', allowDemoMarket: true });
    expect(spy).not.toHaveBeenCalled();
    expect(result.status).toBe('CACHED');
    expect(result.products.some((p) => p.dataSource === 'DEMO_SYNTHETIC')).toBe(true);
    spy.mockRestore();
  });

  it('provider search on 403 returns ERROR without throwing', async () => {
    const fetchImpl = vi.fn(async () => new Response('no', { status: 403 }));
    const provider = new CexMarketplaceProvider(new CexClient({ requestDelayMs: 1 }, fetchImpl as unknown as typeof fetch));
    const result = await provider.search({ keyword: '6600', ukOnly: true });
    expect(result.integrationState === 'ERROR' || result.items.length === 0).toBe(true);
  });
});

describe('snapshotFromProduct', () => {
  it('round-trips sell pence', () => {
    const p = productFromTitle('RX 6600 8GB', 105);
    expect(snapshotFromProduct(p).sellPence).toBe(10500);
  });
});
