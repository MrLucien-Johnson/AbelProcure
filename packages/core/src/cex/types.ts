import { money, type Money } from '../money/money.ts';
import type { DataSource } from '../types/enums.ts';

export const CEX_API_BASE_DEFAULT = 'https://wss2.cex.uk.webuy.io/v3';
export const CEX_STOREFRONT_DEFAULT = 'https://uk.webuy.com';
/** Same Algolia host the uk.webuy.com search box uses. Public, CORS *, no key. */
export const CEX_SEARCH_API_DEFAULT = 'https://search.webuy.io';
export const CEX_SEARCH_INDEX_DEFAULT = 'prod_cex_uk';

export const CEX_USER_AGENT_DEFAULT = 'AbelProcure/0.1 (+https://github.com/MrLucien-Johnson/AbelProcure)';

export interface CexConfig {
  readonly enabled: boolean;
  readonly apiBaseUrl: string;
  readonly searchApiUrl: string;
  readonly searchIndex: string;
  readonly storefrontBaseUrl: string;
  readonly requestDelayMs: number;
  readonly requestTimeoutMs: number;
  readonly maxRetries: number;
  readonly cacheTtlMs: number;
  readonly maxPagesPerRun: number;
  readonly pageSize: number;
  readonly userAgent: string;
  readonly minExpectedProfitPence: number;
  readonly minExpectedRoiBps: number;
  readonly minMarketDiscountBps: number;
  readonly minConfidence: number;
}

export const DEFAULT_CEX_CONFIG: CexConfig = {
  enabled: true,
  apiBaseUrl: CEX_API_BASE_DEFAULT,
  searchApiUrl: CEX_SEARCH_API_DEFAULT,
  searchIndex: CEX_SEARCH_INDEX_DEFAULT,
  storefrontBaseUrl: CEX_STOREFRONT_DEFAULT,
  requestDelayMs: 1500,
  requestTimeoutMs: 15000,
  maxRetries: 2,
  cacheTtlMs: 15 * 60_000,
  maxPagesPerRun: 8,
  pageSize: 50,
  userAgent: CEX_USER_AGENT_DEFAULT,
  minExpectedProfitPence: 4000,
  minExpectedRoiBps: 1200,
  minMarketDiscountBps: 800,
  minConfidence: 0.35,
};

export function cexConfigFromEnv(env: Record<string, string | undefined>): CexConfig {
  const flag = (env.CEX_ENABLED ?? 'true').toLowerCase();
  return {
    enabled: flag !== 'false' && flag !== '0',
    apiBaseUrl: env.CEX_BASE_URL ?? CEX_API_BASE_DEFAULT,
    searchApiUrl: env.CEX_SEARCH_URL ?? CEX_SEARCH_API_DEFAULT,
    searchIndex: env.CEX_SEARCH_INDEX ?? CEX_SEARCH_INDEX_DEFAULT,
    storefrontBaseUrl: env.CEX_STOREFRONT_URL ?? CEX_STOREFRONT_DEFAULT,
    requestDelayMs: Number(env.CEX_REQUEST_DELAY ?? DEFAULT_CEX_CONFIG.requestDelayMs),
    requestTimeoutMs: Number(env.CEX_REQUEST_TIMEOUT ?? DEFAULT_CEX_CONFIG.requestTimeoutMs),
    maxRetries: Number(env.CEX_MAX_RETRIES ?? DEFAULT_CEX_CONFIG.maxRetries),
    cacheTtlMs: Number(env.CEX_CACHE_TTL ?? DEFAULT_CEX_CONFIG.cacheTtlMs),
    maxPagesPerRun: Number(env.CEX_MAX_PAGES_PER_RUN ?? DEFAULT_CEX_CONFIG.maxPagesPerRun),
    pageSize: 50,
    userAgent: env.CEX_USER_AGENT ?? CEX_USER_AGENT_DEFAULT,
    minExpectedProfitPence: Number(env.CEX_MIN_EXPECTED_PROFIT ?? DEFAULT_CEX_CONFIG.minExpectedProfitPence),
    minExpectedRoiBps: Number(env.CEX_MIN_EXPECTED_ROI ?? DEFAULT_CEX_CONFIG.minExpectedRoiBps),
    minMarketDiscountBps: Number(env.CEX_MIN_MARKET_DISCOUNT ?? DEFAULT_CEX_CONFIG.minMarketDiscountBps),
    minConfidence: Number(env.CEX_MIN_CONFIDENCE ?? DEFAULT_CEX_CONFIG.minConfidence),
  };
}

export const CEX_CATEGORIES = {
  gpuPcie: { productLineId: 7, categoryId: 892, name: 'Graphics Cards - PCI-E' },
  captureCards: { productLineId: 7, categoryId: 1153, name: 'Capture Cards' },
  amdCpu: { productLineId: 16, categoryId: 910, name: 'Processors - AMD' },
  intelCpu: { productLineId: 16, categoryId: 911, name: 'Processors - Intel' },
} as const;

export type CexCollectionState = 'LIVE' | 'CACHED' | 'STALE' | 'UNAVAILABLE' | 'DISABLED';

export type CexInventoryEvent =
  | 'NEW'
  | 'RESTOCKED'
  | 'PRICE_DROP'
  | 'PRICE_INCREASE'
  | 'OUT_OF_STOCK'
  | 'UNCHANGED';

export type BargainBand = 'UNDERPRICED' | 'SIGNIFICANTLY_UNDERPRICED' | 'MARKET_PRICE' | 'OVERPRICED';
export type CexDecision = 'BUY' | 'OFFER' | 'WATCH' | 'PASS';
export type PsuClass = 'SAFE' | 'ACCEPTABLE' | 'BORDERLINE' | 'PSU_UPGRADE_RECOMMENDED' | 'INCOMPATIBLE';
export type CpuBalance = 'WELL_MATCHED' | 'MODERATE_BOTTLENECK' | 'HIGH_BOTTLENECK' | 'CPU_UPGRADE_SUGGESTED';

export interface CexBox {
  readonly boxId: string;
  readonly boxName: string;
  readonly categoryId: number | null;
  readonly categoryName: string | null;
  readonly superCatName: string | null;
  readonly sellPrice: number | null;
  readonly cashPrice: number | null;
  readonly exchangePrice: number | null;
  readonly outOfStock: boolean;
  readonly outOfEcomStock: boolean;
  readonly ecomQuantityOnHand: number | null;
  readonly imageLarge: string | null;
  readonly imageMedium: string | null;
  readonly cannotBuy: boolean;
}

export interface CexProduct {
  readonly boxId: string;
  readonly title: string;
  readonly normalisedModel: string | null;
  readonly modelKey: string | null;
  readonly manufacturer: string | null;
  readonly family: string | null;
  readonly variant: string | null;
  readonly vramGb: number | null;
  readonly memoryType: string | null;
  readonly sell: Money | null;
  readonly cash: Money | null;
  readonly voucher: Money | null;
  readonly availability: 'IN_STOCK' | 'ONLINE_ONLY' | 'STORE_ONLY' | 'OUT_OF_STOCK' | 'UNKNOWN';
  readonly onlineAvailable: boolean;
  readonly ecomQuantity: number | null;
  readonly productUrl: string | null;
  readonly imageUrl: string | null;
  readonly collectedAt: string;
  readonly dataSource: DataSource | 'CEX_WEBUY_API' | 'CEX_STOREFRONT_SEARCH' | 'CEX_IMPORT';
  readonly collectionState: CexCollectionState;
  readonly raw: CexBox;
}

export interface CexSnapshotRow {
  readonly boxId: string;
  readonly observedAt: string;
  readonly sellPence: number | null;
  readonly cashPence: number | null;
  readonly voucherPence: number | null;
  readonly outOfStock: boolean;
  readonly ecomQuantity: number | null;
}

export interface CexSnapshotDiff {
  readonly boxId: string;
  readonly event: CexInventoryEvent;
  readonly previousSellPence: number | null;
  readonly currentSellPence: number | null;
}

export function poundsToMoney(value: number | null): Money | null {
  if (value === null || !Number.isFinite(value)) return null;
  const pence = Math.round(value * 100);
  return money(pence);
}
