# Implementation plan

Greenfield build of AbelProcure on branch `cursor/pc-parts-procurement-5e13`.

## Constraints that shaped the plan

1. No existing app to extend — only a two-line README.
2. `developer.ebay.com` HTML was HTTP 403 from this environment; adapters follow public OpenAPI/REST contracts and are marked unverified against a live token.
3. Offer API bidding is Limited Release → UI + provider interface only.
4. Buyer bid notifications are not REST Notification topics → `EBAY_PERMISSION_REQUIRED` + polling fallback.
5. First boot (`npm install && npm run dev`) must work with **zero** eBay/Cloudflare credentials.

## Phase mapping

| Phase | Deliverable | This build |
| --- | --- | --- |
| 1 | Inspection + architecture | `ARCHITECTURE.md`, this file |
| 2 | Frontend shell + PWA | `apps/web` 14-route dark PWA |
| 3 | Database/schema | D1 SQL migrations + TypeScript types |
| 4 | eBay Browse | Real adapter + OAuth + demo fallback |
| 5 | Normalisation | GPU/CPU/MB/RAM/SSD/PSU/case/bundle/PC parsers |
| 6 | Market values | Price book + estimate kinds + confidence |
| 7 | PCDealScore V1 | Transparent weights, versioned |
| 8 | Saved searches | CRUD + yield metrics + expansion |
| 9 | Deal feed | Ranked cards, dual profit, actions |
| 10 | Auction tracking | Command centre, max bid, do-not-chase |
| 11 | Notifications | In-app + browser; email/telegram/discord adapters |
| 12 | Inventory | Full status machine |
| 13 | Build profit | Contribution scoring |
| 14 | Purchase history | Performance by model/category |
| 15 | Learning | Suggestions, never silent weight changes |
| 16 | Analytics | Dashboard KPIs |
| 17 | Security | Headers, webhook verify, `SECURITY.md` |
| 18 | GitHub Pages | Actions workflow |
| 19 | Validation | Vitest (unit/algorithm/parser/security/money) + Playwright smoke |

## What is CODE COMPLETE vs LIVE VERIFIED

Everything that does not require the owner’s eBay app keys and Cloudflare account is implemented and tested in DEMO.

Live Browse/OAuth/webhooks remain **`CONFIGURATION_REQUIRED`** until the owner completes `EBAY_SETUP.md`. Automatic bidding remains **`DISABLED_PENDING_EBAY_APPROVAL`**.

## Out of scope (explicitly)

- Browser automation of eBay
- Scraping Facebook/Gumtree/CeX
- Fabricated production sold-price history
- Silent algorithm mutation from feedback
- Committing secrets
