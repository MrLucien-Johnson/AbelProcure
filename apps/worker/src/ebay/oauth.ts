import { Hono } from 'hono';
import type { Env } from '../env.ts';

function randomUrlSafe(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return btoa(String.fromCharCode(...buf)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

async function sha256Base64Url(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

const pending = new Map<string, { verifier: string; createdAt: number }>();

export function oauthRoutes() {
  const app = new Hono<{ Bindings: Env }>();

  app.get('/oauth/ebay/start', async (c) => {
    if (!c.env.EBAY_CLIENT_ID || !c.env.EBAY_REDIRECT_URI) {
      return c.json({ state: 'EBAY_CREDENTIALS_REQUIRED' }, 412);
    }
    const state = randomUrlSafe(16);
    const verifier = randomUrlSafe(32);
    const challenge = await sha256Base64Url(verifier);
    pending.set(state, { verifier, createdAt: Date.now() });
    const authBase =
      c.env.EBAY_ENV === 'sandbox' ? 'https://auth.sandbox.ebay.com/oauth2/authorize' : 'https://auth.ebay.co.uk/oauth2/authorize';
    const params = new URLSearchParams({
      client_id: c.env.EBAY_CLIENT_ID,
      redirect_uri: c.env.EBAY_REDIRECT_URI,
      response_type: 'code',
      state,
      scope: c.env.EBAY_USER_SCOPES ?? c.env.EBAY_SCOPES ?? 'https://api.ebay.com/oauth/api_scope',
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });
    return c.redirect(`${authBase}?${params.toString()}`);
  });

  app.get('/oauth/ebay/callback', async (c) => {
    const code = c.req.query('code');
    const state = c.req.query('state');
    if (!code || !state) return c.json({ error: 'missing code/state' }, 400);
    const saved = pending.get(state);
    pending.delete(state);
    if (!saved) return c.json({ error: 'invalid oauth state' }, 400);
    if (!c.env.EBAY_CLIENT_ID || !c.env.EBAY_CLIENT_SECRET || !c.env.EBAY_REDIRECT_URI) {
      return c.json({ state: 'EBAY_CREDENTIALS_REQUIRED' }, 412);
    }
    const tokenUrl =
      c.env.EBAY_ENV === 'sandbox'
        ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
        : 'https://api.ebay.com/identity/v1/oauth2/token';
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: c.env.EBAY_REDIRECT_URI,
      code_verifier: saved.verifier,
    });
    const basic = btoa(`${c.env.EBAY_CLIENT_ID}:${c.env.EBAY_CLIENT_SECRET}`);
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    if (!response.ok) {
      return c.json({ error: 'token exchange failed', status: response.status }, 502);
    }
    const json = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };
    if (c.env.DB && c.env.TOKEN_ENCRYPTION_KEY) {
      const encrypted = await encryptSecret(json.refresh_token ?? json.access_token, c.env.TOKEN_ENCRYPTION_KEY);
      await c.env.DB.prepare(
        `INSERT INTO oauth_tokens (id, ebay_account_id, token_kind, access_token_encrypted, refresh_token_encrypted, expires_at, scopes, updated_at)
         VALUES (?, 'default', 'user', ?, ?, ?, ?, ?)`,
      )
        .bind(
          crypto.randomUUID(),
          encrypted,
          json.refresh_token ? encrypted : null,
          new Date(Date.now() + json.expires_in * 1000).toISOString(),
          c.env.EBAY_USER_SCOPES ?? 'https://api.ebay.com/oauth/api_scope',
          new Date().toISOString(),
        )
        .run();
    }
    const front = c.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';
    return c.redirect(`${front}/#/settings?ebay=connected`);
  });

  return app;
}

export async function encryptSecret(plain: string, keyMaterial: string): Promise<string> {
  const keyBytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(keyMaterial));
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plain));
  const packed = new Uint8Array(iv.byteLength + cipher.byteLength);
  packed.set(iv, 0);
  packed.set(new Uint8Array(cipher), iv.byteLength);
  return btoa(String.fromCharCode(...packed));
}
