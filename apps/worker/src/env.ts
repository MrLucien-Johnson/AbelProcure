export interface Env {
  DB: D1Database;
  EBAY_CLIENT_ID?: string;
  EBAY_CLIENT_SECRET?: string;
  EBAY_REDIRECT_URI?: string;
  EBAY_RU_NAME?: string;
  EBAY_ENV?: string;
  EBAY_MARKETPLACE_ID?: string;
  EBAY_SCOPES?: string;
  EBAY_USER_SCOPES?: string;
  EBAY_BUYER_POSTAL_CODE?: string;
  TOKEN_ENCRYPTION_KEY?: string;
  WEBHOOK_VERIFICATION_TOKEN?: string;
  ALLOWED_ORIGINS?: string;
  FRONTEND_ORIGIN?: string;
  APP_BASE_URL?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  CEX_ENABLED?: string;
  CEX_BASE_URL?: string;
  CEX_REQUEST_DELAY?: string;
  CEX_REQUEST_TIMEOUT?: string;
  CEX_MAX_RETRIES?: string;
  CEX_CACHE_TTL?: string;
  CEX_MAX_PAGES_PER_RUN?: string;
}

export function credentialsReady(env: Env): boolean {
  return Boolean(env.EBAY_CLIENT_ID && env.EBAY_CLIENT_SECRET);
}
