# Architecture

AbelProcure is a PC-parts procurement and deal-intelligence system. It ranks eBay UK listings for a builder/reseller who buys components cheaply, assembles gaming PCs, and resells for profit.

It is **not** an eBay search wrapper. Discovery, normalisation, landed-cost accounting, dual-purpose scoring (component flip vs build inventory), auction command, and human-in-the-loop learning are first-class subsystems.

## Repository inspection (Phase 1)

| Check | Result |
| --- | --- |
| Existing application | None. Repository contained only `README.md` (“AbelProcure / Procurement software”). |
| Package manager | None present. This implementation uses **npm workspaces**. |
| Build system | None present. Frontend is **Vite 6 + React 19 + TypeScript**. Backend is **Cloudflare Workers + Hono**. |
| GitHub Actions | None present. Added CI + GitHub Pages deploy. |
| GitHub Pages | None present. Frontend is a static PWA at `/AbelProcure/`. |
| Secrets in client | Forbidden. eBay credentials live only in Worker environment variables. |

## Hosting

```
┌─────────────────────────────┐         ┌──────────────────────────────────┐
│  GitHub Pages (PWA)         │  HTTPS  │  Cloudflare Worker               │
│  React + TypeScript + Vite  │ ──────► │  Hono API                        │
│  Demo mode (no secrets)     │         │  OAuth, Browse, webhooks, cron   │
│  Hash-safe base path        │         │  D1 + rate limits + token vault  │
└─────────────────────────────┘         └──────────────────────────────────┘
```

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend | GitHub Pages + Vite PWA | Specified. Installable, mobile-first, zero hosting cost. |
| Backend | Cloudflare Worker | Specified. HTTPS, cron, global edge, no always-on VM. |
| Database | Cloudflare D1 | Specified. SQLite semantics, migrations, free/lightweight. |
| Cache / rate limit | Worker in-memory + D1 job rows | Avoid extra paid KV until needed. Adapter allows KV later. |

Providers are behind interfaces so D1, eBay, or notification channels can be replaced.

## Trust boundary

The GitHub Pages bundle **never** receives:

- `EBAY_CLIENT_SECRET`
- refresh tokens
- application tokens
- webhook verification keys
- token encryption keys

The browser talks only to the Worker over HTTPS. Demo mode uses in-bundle fixtures labelled `dataSource: DEMO_SYNTHETIC` and does not call eBay.

## Package map

```
packages/core     Domain: money, parsers, PCDealScore, risk, market, search expansion
apps/web          PWA UI (all 14 sections), demo repository, IndexedDB persistence
apps/worker       eBay adapters, OAuth, D1, webhooks, scheduler, alerts
```

`apps/web` and `apps/worker` both import `@abelprocure/core`. Scoring is not duplicated.

## Marketplace adapters

```ts
interface MarketplaceProvider {
  readonly id: 'ebay' | 'facebook' | 'gumtree' | 'cex' | 'cashconverters';
  search(query: SearchQuery): Promise<MarketplaceSearchResult>;
  getListing(id: string): Promise<RawListing | null>;
}
```

Implemented:

- `EbayMarketplaceProvider` (Browse API)
- `CexMarketplaceProvider` (public wss2 JSON; 403 → UNAVAILABLE, no evasion)

Prepared, **not implemented** (no unofficial scraping):

- `FacebookMarketplaceProvider`
- `GumtreeMarketplaceProvider`
- `CashConvertersProvider`

Facebook/Gumtree/CashConverters throw `NOT_IMPLEMENTED` with a clear status. CeX is standalone in `packages/core/src/cex` and mounted on isolated Worker routes so failures cannot break eBay. See [CEX.md](CEX.md).

## eBay integration (researched)

Official developer HTML on `developer.ebay.com` returned HTTP 403 from this environment. Capabilities below are taken from the public Browse OpenAPI (`buy/browse/v1`), Offer API references, and Notification/OAuth programme docs.

### Browse API — **implemented adapter** (needs credentials to go live)

| Item | Value |
| --- | --- |
| Base | `https://api.ebay.com/buy/browse/v1` |
| Sandbox | `https://api.sandbox.ebay.com/buy/browse/v1` |
| Search | `GET /item_summary/search` |
| Item | `GET /item/{itemId}` |
| Legacy ID | `GET /item/get_item_by_legacy_id` |
| Auth | Application access token (client credentials) |
| Marketplace | Header `X-EBAY-C-MARKETPLACE-ID: EBAY_GB` |
| Locale | `Accept-Language: en-GB` |
| Shipping accuracy | `X-EBAY-C-ENDUSERCTX: contextualLocation=country=GB,zip=...` |

**Important Browse behaviour:** search returns **Buy It Now / FIXED_PRICE only by default**. Auction discovery **must** set `filter=buyingOptions:{AUCTION}` (or `{AUCTION|FIXED_PRICE|BEST_OFFER}`).

Token URL: `POST https://api.ebay.com/identity/v1/oauth2/token`  
Scope for Browse: `https://api.ebay.com/oauth/api_scope`

### User OAuth

Authorization code grant with **CSRF `state`** and **PKCE (S256)** where the eBay application allows it. Refresh tokens stay on the Worker, encrypted at rest with `TOKEN_ENCRYPTION_KEY`.

### Offer API (bidding) — **DISABLED_PENDING_EBAY_APPROVAL**

`buy/offer/v1_beta` (`place_proxy_bid`, `getBidding`) is **Limited Release** — select partners only. This app:

- does **not** place bids
- does **not** automate browsers
- records intended max bids, recommended max bids, and manual bid marks
- exposes `BiddingProvider` for a future approved integration

### Sold prices / market comps

Marketplace Insights / completed-sale APIs are limited-release. Without them, estimates are labelled **`ACTIVE_LISTING_ESTIMATE`**, never **`VERIFIED_SOLD_PRICE_DATA`**. The personal price book is the production source of truth once the owner populates it. Seed rows have structure only — **no fabricated live market prices**.

### Notifications

REST Commerce Notification API topics that are generally available (and implemented as handlers):

| Topic | Status |
| --- | --- |
| `MARKETPLACE_ACCOUNT_DELETION` | Adapter ready (required for many apps) |
| `ITEM_PRICE_REVISION` | Adapter ready |
| `ITEM_AVAILABILITY` | Adapter ready |
| `AUTHORIZATION_REVOCATION` | Adapter ready |

Buyer auction topics requested in the product spec (`BID_PLACED`, `OUTBID`, `AUCTION_WON`, seller counteroffer) are **Trading API Platform Notifications** (SOAP), not REST Notification topics. They are marked **`EBAY_PERMISSION_REQUIRED`**. Fallback: Browse `getItem` polling for watched auctions + PWA timers. We do not fake live bid-stream support.

Webhook rules: HTTPS only, signature verification when `x-ebay-signature` is present, reject malformed bodies, persist `notificationId`, idempotent, redact secrets from logs.

## Domain pipeline

```
Raw marketplace listing
    → listingNormaliser (title/aspects → structured component + confidence)
    → searchExpansion / rarity flags
    → description keyword analysis
    → risk engine (PCPartRiskScore)
    → landed cost (integer pence)
    → market value model (price book > verified sold > active estimate)
    → profit / ROI / target buy / build contribution
    → PCDealScore-v1 (inspectable weighted factors)
    → deal card + alerts + observations (never overwrite history)
```

## Money

All currency is **integer pence** (`Money.pence: number` that must be a finite integer). Display uses `en-GB` / Europe/London. Default currency GBP. Percentages that affect money use integer basis points where practical.

## Data

D1 schema is normalised around observations:

- `listings` = current identity (eBay item ID)
- `listing_observations` = immutable snapshots (price, bids, end time, shipping)
- Relists are `POSSIBLE_RELIST`, never assumed identical

Demo records set `data_source = 'DEMO_SYNTHETIC'` and are excluded from production analytics.

## Frontend modes

| Mode | When | Data |
| --- | --- | --- |
| DEMO | No Worker URL, Worker unhealthy, or user toggle | Synthetic fixtures in `@abelprocure/core` + IndexedDB for local decisions |
| LIVE | Worker configured and eBay application token healthy | Browse API via Worker; D1 persistence |

`npm run dev` always boots DEMO. Production integrations show `CONFIGURATION_REQUIRED` rather than crashing.

## Security (summary)

See `SECURITY.md`. Highlights: no secrets in the SPA, OAuth state + PKCE, webhook verification, rate limits, CSP/security headers on the Worker, encrypted refresh tokens, XSS-safe React rendering (no `dangerouslySetInnerHTML` except sanitised highlight snippets).

## Time-critical alerts

GitHub Actions cron is **not** used as the auction timer. The Worker cron (every minute) evaluates watched auctions approaching thresholds. The PWA also runs local countdowns and can show in-app/browser notifications while the tab/app is open. Push (Web Push / VAPID) is architected; keys are `CONFIGURATION_REQUIRED` until set.
