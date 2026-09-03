# Security

## Mandatory controls

- **No API credentials in the frontend bundle.** `VITE_*` may only contain the public Worker URL and a demo flag.
- GitHub Secrets / Cloudflare secrets for CI and the Worker only.
- OAuth `state` validation and PKCE (S256) on the user-authorization flow.
- CSRF: state parameter; Worker CORS allowlist.
- XSS: React text rendering. Description highlights use structured hits, not raw HTML injection.
- Security headers via Hono `secureHeaders`.
- Incoming Browse payloads are mapped through typed adapters (no `any`).
- Rate limiting (`rateLimitManager`) plus short-lived `requestCache`.
- Webhook verification (`x-ebay-signature` public-key lookup, or verification token).
- Minimal OAuth scopes (`https://api.ebay.com/oauth/api_scope` by default).
- Refresh tokens encrypted with AES-GCM (`TOKEN_ENCRYPTION_KEY`).
- Logs must not print client secrets, tokens, or authorization headers.

## Automatic buying

Programmatic bidding is **`DISABLED_PENDING_EBAY_APPROVAL`**. There is no browser automation.

## Threat notes

GitHub Pages is a static origin. Treat it as hostile: it can be copied. All privileged work stays on the Worker.
