# Deployment

## Frontend — GitHub Pages

1. Repository Settings → Pages → Build and deployment → Source: **GitHub Actions**.
2. Merge to `main` (or run the `GitHub Pages` workflow).
3. Site URL: `https://mrlucien-johnson.github.io/AbelProcure/`

The Vite `base` is `/AbelProcure/` when `GITHUB_PAGES=true`. `404.html` redirects deep links back into the SPA.

The Pages bundle contains **no eBay secrets**.

## Backend — Cloudflare Worker + D1

1. Install Wrangler and authenticate (`npx wrangler login`).
2. Create D1: `npx wrangler d1 create abelprocure`.
3. Put the database id into `apps/worker/wrangler.toml`.
4. Apply migrations: `npx wrangler d1 migrations apply abelprocure --remote`.
5. Set Worker secrets (`wrangler secret put EBAY_CLIENT_ID`, etc.).
6. Deploy: `npm run deploy -w @abelprocure/worker`.
7. Set `VITE_API_BASE_URL` at **build time** for Pages (GitHub Actions variable) to the Worker origin.

## GitHub Actions secrets (CI/Pages only)

Pages deploy uses `GITHUB_TOKEN` only. Do **not** put eBay client secrets in Actions unless you add a private scheduled job later. GitHub cron is **not** an auction timer.

## After deploy

1. Open Pages URL — demo must still work.
2. Open Settings wizard and complete eBay steps.
3. Open System Status — Browse should move from `EBAY_CREDENTIALS_REQUIRED` to `READY` only after a successful token + search.
