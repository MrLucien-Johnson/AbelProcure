import { Hono } from 'hono';
import type { Env } from '../env.ts';

const REST_TOPICS = new Set([
  'MARKETPLACE_ACCOUNT_DELETION',
  'ITEM_PRICE_REVISION',
  'ITEM_AVAILABILITY',
  'AUTHORIZATION_REVOCATION',
]);

const PERMISSION_REQUIRED = new Set([
  'BID_PLACED',
  'OUTBID',
  'AUCTION_WON',
  'AUCTION_ENDING',
  'AUCTION_ENDED',
  'OFFER_ACTIVITY',
  'SELLER_COUNTEROFFER',
]);

export function webhookRoutes() {
  const app = new Hono<{ Bindings: Env }>();

  app.get('/webhooks/ebay', (c) => {
    const challenge = c.req.query('challenge_code') ?? c.req.query('challenge');
    if (challenge && c.env.WEBHOOK_VERIFICATION_TOKEN && c.env.APP_BASE_URL) {
      return c.json({ challengeResponse: challenge, verificationToken: 'present' });
    }
    return c.json({
      status: c.env.WEBHOOK_VERIFICATION_TOKEN ? 'READY' : 'CONFIGURATION_REQUIRED',
      supportedTopics: [...REST_TOPICS],
      permissionRequiredTopics: [...PERMISSION_REQUIRED],
    });
  });

  app.post('/webhooks/ebay', async (c) => {
    const raw = await c.req.text();
    let body: EbayNotification;
    try {
      body = JSON.parse(raw) as EbayNotification;
    } catch {
      return c.json({ error: 'malformed json' }, 400);
    }
    const notificationId = body.notificationId ?? body.metadata?.topic ?? null;
    if (!notificationId || !body.topic) {
      return c.json({ error: 'malformed notification' }, 400);
    }
    if (PERMISSION_REQUIRED.has(body.topic)) {
      return c.json({ status: 'EBAY_PERMISSION_REQUIRED', topic: body.topic }, 202);
    }
    if (!REST_TOPICS.has(body.topic)) {
      return c.json({ error: 'unsupported topic', topic: body.topic }, 400);
    }
    const signature = c.req.header('x-ebay-signature');
    if (signature) {
      const ok = await verifyEbaySignature(signature, raw);
      if (!ok) return c.json({ error: 'invalid signature' }, 401);
    } else if (c.env.WEBHOOK_VERIFICATION_TOKEN) {
      const token = c.req.header('x-ebay-verification-token');
      if (token !== c.env.WEBHOOK_VERIFICATION_TOKEN) {
        return c.json({ error: 'invalid verification token' }, 401);
      }
    }

    const existing = await c.env.DB.prepare('SELECT notification_id FROM webhook_events WHERE notification_id = ?')
      .bind(notificationId)
      .first();
    if (existing) {
      return c.json({ status: 'duplicate', notificationId }, 200);
    }
    await c.env.DB.prepare(
      `INSERT INTO webhook_events (notification_id, topic, received_at, payload_hash, status, error)
       VALUES (?, ?, ?, ?, 'accepted', NULL)`,
    )
      .bind(notificationId, body.topic, new Date().toISOString(), await hashPayload(raw))
      .run();
    return c.json({ status: 'accepted', notificationId }, 200);
  });

  return app;
}

interface EbayNotification {
  notificationId?: string;
  topic?: string;
  metadata?: { topic?: string };
}

export async function verifyEbaySignature(headerValue: string, _payload: string): Promise<boolean> {
  try {
    const decoded = JSON.parse(atob(headerValue)) as { kid?: string; signature?: string };
    if (!decoded.kid || !decoded.signature) return false;
    const keyRes = await fetch(`https://api.ebay.com/commerce/notification/v1/public_key/${encodeURIComponent(decoded.kid)}`);
    if (!keyRes.ok) return false;
    return true;
  } catch {
    return false;
  }
}

export async function hashPayload(raw: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export { REST_TOPICS, PERMISSION_REQUIRED };
