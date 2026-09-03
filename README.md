# AbelProcure

PC parts procurement, auction tracking and deal scoring for a UK gaming-PC builder/reseller.

This is **not** a generic eBay search page. It ranks listings using landed cost, a personal price book, build-gap usefulness, seller/condition risk, and an inspectable score (`PCDealScore-v1`).

## Clone to working demo

```bash
git clone https://github.com/MrLucien-Johnson/AbelProcure.git
cd AbelProcure
npm install
npm run dev
```

Open http://localhost:5173

You get **DEMO MODE** immediately: synthetic eBay-like fixtures labelled `DEMO_SYNTHETIC`, a ranked Deal Feed, auctions, builds, inventory, algorithm explorer, and alerts. No eBay keys required. The app will not crash if eBay is unconfigured.

Useful scripts:

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite PWA (demo) |
| `npm test` | Unit / algorithm / parser / money / webhook tests |
| `npm run typecheck` | TypeScript project references |
| `npm run lint` | ESLint |
| `npm run build` | Production GitHub Pages bundle |
| `npm run dev:worker` | Cloudflare Worker (needs wrangler + optional `.dev.vars`) |

## Then connect a real eBay production account

Follow the numbered steps in [EBAY_SETUP.md](EBAY_SETUP.md), then [DEPLOYMENT.md](DEPLOYMENT.md).

Until those secrets exist:

| Integration | State |
| --- | --- |
| Browse API | `EBAY_CREDENTIALS_REQUIRED` |
| User OAuth | `EBAY_USER_AUTHORIZATION_REQUIRED` |
| Buyer bid events | `EBAY_PERMISSION_REQUIRED` |
| Automatic bidding | `DISABLED_PENDING_EBAY_APPROVAL` |

The UI still works. Live search results will not appear until the Worker has an application token.

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)
- [ALGORITHM.md](ALGORITHM.md)
- [DATABASE.md](DATABASE.md)
- [SECURITY.md](SECURITY.md)
- [NOTIFICATIONS.md](NOTIFICATIONS.md)
- [PC_COMPONENT_NORMALISATION.md](PC_COMPONENT_NORMALISATION.md)
- [DEVELOPMENT.md](DEVELOPMENT.md)
- [EBAY_SETUP.md](EBAY_SETUP.md)
- [DEPLOYMENT.md](DEPLOYMENT.md)

## Principles

- Money is integer pence. Never treat asking prices as sold comps.
- Humans remain in control of every purchase and bid.
- Demo records never mix into production statistics.
- No secrets in the GitHub Pages JavaScript bundle.
