import type { SearchQuery } from '@abelprocure/core';
import type { RawListing } from '@abelprocure/core';
import { fromPounds, money, type MarketplaceProvider, type MarketplaceSearchResult } from '@abelprocure/core';
import type { Env } from '../env.ts';
import { RequestCache, RateLimitManager } from '../jobs/rateLimit.ts';

interface TokenCache {
  token: string;
  expiresAt: number;
}

export class EbayMarketplaceProvider implements MarketplaceProvider {
  readonly id = 'ebay' as const;
  private token: TokenCache | null = null;
  private readonly cache = new RequestCache<MarketplaceSearchResult>(45_000);
  readonly limiter = new RateLimitManager(80, 60_000);

  constructor(private readonly env: Env) {}

  configured(): boolean {
    return Boolean(this.env.EBAY_CLIENT_ID && this.env.EBAY_CLIENT_SECRET);
  }

  async search(query: SearchQuery): Promise<MarketplaceSearchResult> {
    if (!this.configured()) {
      return { items: [], integrationState: 'CONFIGURATION_REQUIRED' };
    }
    const cacheKey = JSON.stringify(query);
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;
    if (!this.limiter.tryConsume()) {
      return { items: [], integrationState: 'ERROR', total: 0 };
    }
    const token = await this.getApplicationToken();
    const url = this.buildSearchUrl(query);
    const response = await fetch(url, { headers: this.headers(token) });
    if (!response.ok) {
      throw new Error(`Browse search failed: ${response.status}`);
    }
    const json = (await response.json()) as BrowseSearchResponse;
    const items = (json.itemSummaries ?? []).map((row) => mapSummary(row, this.env));
    const result: MarketplaceSearchResult = {
      items,
      total: json.total,
      integrationState: 'READY',
    };
    this.cache.set(cacheKey, result);
    return result;
  }

  async getListing(id: string): Promise<RawListing | null> {
    if (!this.configured()) return null;
    if (!this.limiter.tryConsume()) return null;
    const token = await this.getApplicationToken();
    const base = this.apiBase();
    const response = await fetch(`${base}/item/${encodeURIComponent(id)}`, { headers: this.headers(token) });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Browse getItem failed: ${response.status}`);
    const json = (await response.json()) as BrowseItem;
    return mapItem(json, this.env);
  }

  async getApplicationToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 30_000) {
      return this.token.token;
    }
    if (!this.env.EBAY_CLIENT_ID || !this.env.EBAY_CLIENT_SECRET) {
      throw Object.assign(new Error('EBAY_CREDENTIALS_REQUIRED'), { code: 'EBAY_CREDENTIALS_REQUIRED' });
    }
    const basic = btoa(`${this.env.EBAY_CLIENT_ID}:${this.env.EBAY_CLIENT_SECRET}`);
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      scope: this.env.EBAY_SCOPES ?? 'https://api.ebay.com/oauth/api_scope',
    });
    const response = await fetch(this.tokenUrl(), {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    if (!response.ok) {
      throw new Error(`eBay client-credentials grant failed: ${response.status}`);
    }
    const json = (await response.json()) as { access_token: string; expires_in: number };
    this.token = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
    return json.access_token;
  }

  private buildSearchUrl(query: SearchQuery): string {
    const params = new URLSearchParams();
    const q = [query.keyword, query.model, query.manufacturer].filter(Boolean).join(' ');
    if (q) params.set('q', q);
    params.set('limit', '50');
    const filters: string[] = [];
    const buying: string[] = [];
    if (query.auctionOnly) buying.push('AUCTION');
    if (query.buyItNowOnly) buying.push('FIXED_PRICE');
    if (query.bestOffer) buying.push('BEST_OFFER');
    if (buying.length === 0) buying.push('AUCTION', 'FIXED_PRICE', 'BEST_OFFER');
    filters.push(`buyingOptions:{${buying.join('|')}}`);
    if (query.ukOnly !== false) {
      filters.push('itemLocationCountry:GB');
      filters.push('deliveryCountry:GB');
    }
    if (query.maxItemPence) {
      filters.push(`price:[..${(query.maxItemPence / 100).toFixed(2)}]`);
      filters.push('priceCurrency:GBP');
    }
    if (query.condition) {
      // condition filter left as keyword support; IDs vary by marketplace
    }
    params.set('filter', filters.join(','));
    if (query.endingSoon) params.set('sort', 'endingSoonest');
    else if (query.newlyListed) params.set('sort', 'newlyListed');
    return `${this.apiBase()}/item_summary/search?${params.toString()}`;
  }

  private headers(token: string): HeadersInit {
    const marketplace = this.env.EBAY_MARKETPLACE_ID ?? 'EBAY_GB';
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'X-EBAY-C-MARKETPLACE-ID': marketplace,
      'Accept-Language': 'en-GB',
    };
    if (this.env.EBAY_BUYER_POSTAL_CODE) {
      headers['X-EBAY-C-ENDUSERCTX'] = `contextualLocation=country=GB,zip=${this.env.EBAY_BUYER_POSTAL_CODE}`;
    }
    return headers;
  }

  private apiBase(): string {
    return this.env.EBAY_ENV === 'sandbox'
      ? 'https://api.sandbox.ebay.com/buy/browse/v1'
      : 'https://api.ebay.com/buy/browse/v1';
  }

  private tokenUrl(): string {
    return this.env.EBAY_ENV === 'sandbox'
      ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
      : 'https://api.ebay.com/identity/v1/oauth2/token';
  }
}

interface BrowseAmount {
  value: string;
  currency: string;
}

interface BrowseSummary {
  itemId: string;
  legacyItemId?: string;
  title: string;
  shortDescription?: string;
  image?: { imageUrl?: string };
  additionalImages?: { imageUrl?: string }[];
  price?: BrowseAmount;
  currentBidPrice?: BrowseAmount;
  itemWebUrl?: string;
  condition?: string;
  conditionId?: string;
  buyingOptions?: string[];
  bidCount?: number;
  itemEndDate?: string;
  itemCreationDate?: string;
  itemLocation?: { city?: string; country?: string };
  seller?: { username?: string; feedbackPercentage?: string; feedbackScore?: number };
  shippingOptions?: { shippingCost?: BrowseAmount }[];
  categories?: { categoryId?: string; categoryName?: string }[];
  topRatedBuyingExperience?: boolean;
}

interface BrowseSearchResponse {
  total?: number;
  itemSummaries?: BrowseSummary[];
}

interface BrowseItem extends BrowseSummary {
  description?: string;
  returnTerms?: { returnsAccepted?: boolean };
}

function mapSummary(row: BrowseSummary, env: Env): RawListing {
  const buying = row.buyingOptions ?? [];
  const listingType = inferListingType(buying);
  const price = parseAmount(row.currentBidPrice ?? row.price);
  const postage = parseAmount(row.shippingOptions?.[0]?.shippingCost);
  const now = new Date().toISOString();
  return {
    marketplace: 'ebay',
    itemId: row.itemId,
    legacyItemId: row.legacyItemId ?? null,
    title: row.title,
    subtitle: null,
    description: row.shortDescription ?? null,
    imageUrls: [row.image?.imageUrl, ...(row.additionalImages ?? []).map((i) => i.imageUrl)].filter((u): u is string => Boolean(u)),
    stockImageLikely: !row.additionalImages?.length,
    itemWebUrl: row.itemWebUrl ?? '',
    categoryId: row.categories?.[0]?.categoryId ?? null,
    categoryPath: row.categories?.map((c) => c.categoryName).filter(Boolean).join(' > ') ?? null,
    condition: mapCondition(row.condition),
    conditionText: row.condition ?? null,
    listingType,
    buyingOptions: buying,
    itemPrice: price,
    postage,
    collectionOnly: false,
    collectionDistanceMiles: null,
    bidCount: row.bidCount ?? null,
    currentBid: row.currentBidPrice ? parseAmount(row.currentBidPrice) : null,
    endTime: row.itemEndDate ?? null,
    listedAt: row.itemCreationDate ?? null,
    seller: {
      username: row.seller?.username ?? null,
      feedbackScore: row.seller?.feedbackScore ?? null,
      feedbackPercentage: row.seller?.feedbackPercentage ? Number(row.seller.feedbackPercentage) : null,
      topRated: row.topRatedBuyingExperience ?? null,
    },
    itemLocation: row.itemLocation?.city ?? null,
    returnsAccepted: null,
    country: row.itemLocation?.country ?? (env.EBAY_MARKETPLACE_ID === 'EBAY_GB' ? 'GB' : null),
    dataSource: 'EBAY_BROWSE',
    firstSeenAt: now,
    lastSeenAt: now,
  };
}

function mapItem(row: BrowseItem, env: Env): RawListing {
  return {
    ...mapSummary(row, env),
    description: row.description ?? row.shortDescription ?? null,
    returnsAccepted: row.returnTerms?.returnsAccepted ?? null,
  };
}

function parseAmount(amount?: BrowseAmount): ReturnType<typeof money> {
  if (!amount?.value) return money(0);
  const [whole, frac = '00'] = amount.value.split('.');
  const pence = Number(whole) * 100 + Number((frac + '00').slice(0, 2));
  if (!Number.isInteger(pence)) return fromPounds(amount.value);
  return money(pence);
}

function inferListingType(buying: string[]): RawListing['listingType'] {
  const auction = buying.includes('AUCTION');
  const bin = buying.includes('FIXED_PRICE');
  const offer = buying.includes('BEST_OFFER');
  if (auction && bin) return 'AUCTION_WITH_BIN';
  if (auction) return 'AUCTION';
  if (offer) return 'BEST_OFFER';
  return 'BUY_IT_NOW';
}

function mapCondition(value?: string): RawListing['condition'] {
  const v = (value ?? '').toUpperCase();
  if (v.includes('NEW') && !v.includes('OPEN')) return 'NEW';
  if (v.includes('OPEN')) return 'OPEN_BOX';
  if (v.includes('PARTS') || v.includes('NOT WORKING')) return 'FOR_PARTS';
  if (v.includes('EXCELLENT')) return 'USED_EXCELLENT';
  if (v.includes('VERY GOOD')) return 'USED_VERY_GOOD';
  if (v.includes('GOOD')) return 'USED_GOOD';
  if (v.includes('REFURB')) return 'SELLER_REFURBISHED';
  return 'UNKNOWN';
}
