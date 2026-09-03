# Development

## Layout

```
packages/core     domain logic + tests
apps/web          React PWA
apps/worker       Cloudflare Worker
```

## First boot

```bash
npm install
npm run dev
```

TypeScript is strict. `any` is an ESLint error.

## Tests

```bash
npm test
```

Money tests refuse floating pence. Algorithm fixtures A–D live in `packages/core/src/scoring/dealScore.test.ts`.

## Adding a GPU model

1. Add a catalog row in `packages/core/src/catalog/models.ts`.
2. Add aliases/typos.
3. Add a price-book **structure** row (production values stay empty).
4. Add a parser test if the title pattern is unusual.

## Worker locally

```bash
cp .env.example apps/worker/.dev.vars
# fill names only as you obtain them
npm run dev:worker
```

Set `VITE_API_BASE_URL=http://127.0.0.1:8787` in `apps/web/.env.local` to point the PWA at the Worker. Leave it unset for pure demo.

## Timezone / currency

Internal timestamps are ISO-8601 UTC. Presentation default `Europe/London`. Money default GBP. Marketplace default `EBAY_GB`.
