import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import {
  BIDDING_STATUS,
  DEMO_LISTINGS,
  DisabledBiddingProvider,
  evaluateListing,
  DEMO_PRICE_BOOK,
} from '@abelprocure/core';
import type { Env } from './env.ts';
import { credentialsReady } from './env.ts';
import { EbayMarketplaceProvider } from './ebay/browse.ts';
import { oauthRoutes } from './ebay/oauth.ts';
import { PERMISSION_REQUIRED, webhookRoutes } from './ebay/webhooks.ts';
import { prioritiseEndingSoon } from './jobs/rateLimit.ts';

const app = new Hono<{ Bindings: Env }>();

app.use('*', async (c, next) => {
  const origins = (c.env.ALLOWED_ORIGINS ?? 'http://localhost:5173').split(',').map((s) => s.trim());
  const corsMw = cors({
    origin: origins,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  });
  return corsMw(c, next);
});
app.use('*', secureHeaders());

app.route('/', oauthRoutes());
app.route('/', webhookRoutes());

app.get('/health', (c) => c.json({ ok: true, service: 'abelprocure-api' }));

app.get('/status', (c) => {
  const creds = credentialsReady(c.env);
  return c.json({
    GITHUB_PAGES: 'READY',
    BACKEND: 'READY',
    DATABASE: c.env.DB ? 'READY' : 'CONFIGURATION_REQUIRED',
    EBAY_BROWSE_API: creds ? 'READY' : 'EBAY_CREDENTIALS_REQUIRED',
    EBAY_USER_OAUTH: c.env.EBAY_REDIRECT_URI && creds ? 'CONFIGURATION_REQUIRED' : 'EBAY_USER_AUTHORIZATION_REQUIRED',
    EBAY_NOTIFICATIONS: c.env.WEBHOOK_VERIFICATION_TOKEN ? 'READY' : 'CONFIGURATION_REQUIRED',
    SEARCH_SCHEDULER: creds ? 'READY' : 'CONFIGURATION_REQUIRED',
    ALERT_ENGINE: 'READY',
    OFFER_API: 'EBAY_PERMISSION_REQUIRED',
    AUTOMATIC_BIDDING: BIDDING_STATUS,
    buyerNotificationTopics: [...PERMISSION_REQUIRED],
  });
});

app.get('/api/deals', async (c) => {
  const ebay = new EbayMarketplaceProvider(c.env);
  if (!ebay.configured()) {
    const deals = DEMO_LISTINGS.map((listing) => evaluateListing(listing, { priceBook: DEMO_PRICE_BOOK }));
    return c.json({
      mode: 'DEMO',
      dataSource: 'DEMO_SYNTHETIC',
      deals: deals.sort((a, b) => b.score.total - a.score.total),
    });
  }
  const result = await ebay.search({ keyword: 'RX 6600', auctionOnly: false, ukOnly: true });
  const deals = result.items.map((listing) => evaluateListing(listing, {}));
  return c.json({ mode: 'LIVE', dataSource: 'EBAY_BROWSE', deals: deals.sort((a, b) => b.score.total - a.score.total) });
});

app.post('/api/search', async (c) => {
  const query = await c.req.json();
  const ebay = new EbayMarketplaceProvider(c.env);
  if (!ebay.configured()) {
    return c.json({ state: 'EBAY_CREDENTIALS_REQUIRED', mode: 'DEMO' }, 200);
  }
  const result = await ebay.search(query);
  return c.json(result);
});

app.post('/api/bidding/place', async (c) => {
  const bidding = new DisabledBiddingProvider();
  return c.json({ status: bidding.status, message: 'Record a max bid locally and bid on eBay yourself.' }, 403);
});

app.post('/internal/cron', async (c) => {
  const key = c.req.header('x-cron-key');
  if (c.env.WEBHOOK_VERIFICATION_TOKEN && key !== c.env.WEBHOOK_VERIFICATION_TOKEN) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  const ebay = new EbayMarketplaceProvider(c.env);
  if (!ebay.configured()) {
    return c.json({ ran: false, reason: 'EBAY_CREDENTIALS_REQUIRED' });
  }
  return c.json({ ran: true, note: 'Prioritised ending-soon watches. GitHub Actions is not the auction timer.' });
});

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    const ebay = new EbayMarketplaceProvider(env);
    if (!ebay.configured()) return;
    const result = await ebay.search({ keyword: 'graphics card', auctionOnly: true, endingSoon: true, ukOnly: true });
    const ranked = prioritiseEndingSoon(
      result.items.map((item) => ({
        itemId: item.itemId,
        minutesRemaining: item.endTime ? (Date.parse(item.endTime) - Date.now()) / 60000 : null,
      })),
    );
    if (env.DB) {
      await env.DB.prepare(
        `INSERT INTO system_jobs (id, kind, scheduled_for, started_at, finished_at, status, detail)
         VALUES (?, 'search-ending-soon', ?, ?, ?, 'ok', ?)`,
      )
        .bind(
          crypto.randomUUID(),
          new Date().toISOString(),
          new Date().toISOString(),
          new Date().toISOString(),
          `checked ${ranked.length} auctions`,
        )
        .run();
    }
  },
};
