# CeX UK inventory intelligence

Standalone CeX collector + Build 4 opportunity engine that integrates with AbelProcure through the existing `MarketplaceProvider` boundary. eBay Browse code is unchanged.

## Architecture

```
MarketplaceProvider
  ├── EbayMarketplaceProvider     apps/worker/src/ebay/browse.ts  (unchanged)
  └── CexMarketplaceProvider      packages/core/src/cex/provider.ts
```

CeX lives in `packages/core/src/cex/*` so it can run without the Worker or eBay credentials. The Worker mounts isolated routes (`/api/cex/*`, `/internal/cex-scan`) and a try/catch cron path. A CeX 403 does not skip eBay search; an eBay failure does not skip CeX.

## Acquisition

The storefront `https://uk.webuy.com/` is a Nuxt SPA. Inventory is **not** in static HTML.

Public JSON the site uses:

| Endpoint | Notes |
| --- | --- |
| `GET https://wss2.cex.uk.webuy.io/v3/productlines` | Taxonomy. Observed working. |
| `GET .../categories?productLineIds=[7]` | Graphics line. PCI-E GPUs = **categoryId 892**. |
| `GET .../boxes?categoryIds=[892]&firstRecord=1&count=50` | Inventory. Often **Cloudflare 403** from datacentre IPs. |

We identify as `AbelProcure/0.1 (+https://github.com/MrLucien-Johnson/AbelProcure)`, default delay 1500ms, stop on 401/403/429. No stealth, no CAPTCHA bypass.

Product URLs are `https://uk.webuy.com/product-detail?id={boxId}` constructed from the API `boxId`, never invented IDs.

If `/boxes` is blocked: collection state is `UNAVAILABLE`, last success timestamp is kept, and you can `POST /api/cex/scan` with `{ "mode": "import", "payload": <raw /boxes JSON> }`.

## Commands

```bash
npm test                         # unit tests (fixtures only — no live CeX)
npm run cex:scan:demo            # score labelled DEMO_SYNTHETIC fixtures
npm run cex:scan                 # one-off live GPU scan
npm run cex:scan:gpu             # same
npm run cex:scan:all             # GPU + AMD/Intel CPU categories
npm run cex:opportunities        # demo opportunity calc (Build 4)
npm run cex:import -- --import=./boxes.json
```

Worker (integrated):

```bash
curl -X POST "$APP_BASE_URL/api/cex/scan" -H 'content-type: application/json' -d '{"mode":"live","categories":"gpu"}'
curl -X POST "$APP_BASE_URL/internal/cex-scan" -H "x-cron-key: $WEBHOOK_VERIFICATION_TOKEN"
```

## UI

Routes (existing screens untouched):

- `/cex` overview
- `/cex/gpus`
- `/cex/opportunities`
- `/cex/history`

With GitHub Pages base path: `/AbelProcure/cex` (BrowserRouter). Locally: `http://localhost:5173/cex`.

Collection badge is one of `LIVE` / `CACHED` / `STALE` / `UNAVAILABLE` / `DISABLED`. Demo fixtures are `CACHED` + `DEMO_SYNTHETIC`.

## Profit algorithm (Build 4)

```
ExpectedNetProfit = ExpectedSalePrice
  - TotalBuildCost          # £268.93 + GPU landed
  - ExpectedSellingCosts    # 12.8% default
  - ExpectedShippingCosts   # £4.95 out + £1.50 pack
  - RiskAllowance           # repair reserve when present
```

GTX 1080 Strix pending offer **£95 + £5.15 = £100.15** is a comparison benchmark, not a hard-coded winner.

PSU classes on the older Corsair VS550: `SAFE` / `ACCEPTABLE` / `BORDERLINE` / `PSU_UPGRADE_RECOMMENDED` / `INCOMPATIBLE`. Powerful cards are not auto-rejected on nameplate wattage alone.

CPU: Ryzen 5 PRO 2400G. Higher GPUs get a bottleneck flag plus optional AM4 upgrades (3600 / 3600X / 5600) when the upgrade lifts net profit by more than £15.

Spare Gigabyte GT 1030 OC (£34.83) is inventory only — never auto-allocated to Build 4.

## Opportunity score (configurable weights)

| Factor | Default |
| --- | --- |
| Finished-PC net profit | 30% |
| ROI | 15% |
| GPU performance / £ | 15% |
| Market demand | 10% |
| VRAM / generation | 10% |
| Acquisition risk | 10% |
| Power / compatibility | 5% |
| Resale liquidity | 5% |

Decision: `BUY` / `OFFER` / `WATCH` / `PASS` plus a hard max buy. Bargain bands require meaningful margin after fees — a £3 discount does not alert.

## eBay comparison

Reuses the existing price book / sold observations. Browse API does **not** provide verified solds; asking prices are not treated as expected resale. Demo sold-band numbers are labelled `DEMO_SYNTHETIC`.

Complete-PC matching searches existing listing titles for GPU + Ryzen 5 (broad) or exact CPU tokens.

## Database

`apps/worker/migrations/0002_cex.sql` — `cex_products`, `cex_snapshots`, `cex_runs`. Does not reuse eBay `item_id`.

## Configuration

See `.env.example`. Defaults: `CEX_ENABLED=true`, delay 1500ms, timeout 15s, 2 retries, 8 pages/run, cache 15 minutes.

## Limitations

- `/boxes` may be Cloudflare 403 from this environment. Taxonomy endpoints often still work.
- No Marketplace Insights sold API — sold evidence is owner price book or imported observations.
- Finished-PC sale estimates in demo mode are `DEMO_SYNTHETIC`, not live comps.
- Other CeX categories (RAM, SSD, PSU, cases) are category-mapped but not fully scored yet; GPUs are first.

## Troubleshooting

| Symptom | What to do |
| --- | --- |
| `UNAVAILABLE` + HTTP 403 | Expected from some IPs. Import `/boxes` JSON captured in a browser, or wait. Do not add evasion. |
| HTTP 429 | Client stops. Increase `CEX_REQUEST_DELAY`. |
| Stale UI | Check `lastSuccessAt`. Do not treat cached demo fixtures as live stock. |
| Empty opportunities | Missing price book / estimates → `INSUFFICIENT_DATA`. Fill the price book. |
