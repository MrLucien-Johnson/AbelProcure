import type { MarketplaceProvider, MarketplaceSearchResult } from '../marketplace/types.ts';
import type { SearchQuery } from '../search/types.ts';
import type { RawListing } from '../types/listing.ts';
import { CexClient, CexCollectionError } from './client.ts';
import { boxToProduct } from './normalise.ts';
import { DEMO_CEX_BOXES } from './fixtures.ts';
import { cexProductToListing } from './listingAdapter.ts';
import { CEX_CATEGORIES, DEFAULT_CEX_CONFIG, type CexConfig, type CexProduct } from './types.ts';

export class CexMarketplaceProvider implements MarketplaceProvider {
  readonly id = 'cex' as const;
  private cache: { expires: number; products: CexProduct[] } | null = null;

  constructor(
    private readonly client: CexClient = new CexClient(),
    private readonly config: CexConfig = client.config,
  ) {}

  async search(query: SearchQuery): Promise<MarketplaceSearchResult> {
    try {
      const products = await this.loadProducts(categoryIdsFor(query));
      const filtered = filterProducts(products, query);
      return {
        items: filtered.map(cexProductToListing),
        total: filtered.length,
        integrationState: products.some((p) => p.dataSource === 'DEMO_SYNTHETIC')
          ? 'DEMO'
          : products.length
            ? 'READY'
            : 'ERROR',
      };
    } catch (err) {
      const code = err instanceof CexCollectionError ? err.status : 'ERROR';
      if (code === 'DISABLED') {
        return { items: [], integrationState: 'CONFIGURATION_REQUIRED' };
      }
      return { items: [], integrationState: 'ERROR' };
    }
  }

  async getListing(id: string): Promise<RawListing | null> {
    const boxId = id.startsWith('cex:') ? id.slice(4) : id;
    const products = await this.loadProducts([CEX_CATEGORIES.gpuPcie.categoryId]);
    const hit = products.find((p) => p.boxId === boxId);
    return hit ? cexProductToListing(hit) : null;
  }

  async loadProducts(categoryIds: number[]): Promise<CexProduct[]> {
    const now = Date.now();
    if (this.cache && this.cache.expires > now) return this.cache.products;
    if (!this.config.enabled) {
      throw new CexCollectionError('CEX_ENABLED=false', 'DISABLED');
    }
    const collectedAt = new Date().toISOString();
    try {
      const page = await this.client.collectBoxes(categoryIds);
      const products = page.boxes.map((box) =>
        boxToProduct(box, {
          collectedAt,
          dataSource: 'CEX_WEBUY_API',
          collectionState: 'LIVE',
          storefront: this.config.storefrontBaseUrl,
        }),
      );
      this.cache = { expires: now + this.config.cacheTtlMs, products };
      return products;
    } catch (err) {
      if (err instanceof CexCollectionError && err.httpStatus === 403) {
        return [];
      }
      throw err;
    }
  }
}

export function demoCexProducts(collectedAt = new Date().toISOString()): CexProduct[] {
  return DEMO_CEX_BOXES.map((box) =>
    boxToProduct(box, {
      collectedAt,
      dataSource: 'DEMO_SYNTHETIC',
      collectionState: 'CACHED',
      storefront: DEFAULT_CEX_CONFIG.storefrontBaseUrl,
    }),
  );
}

function categoryIdsFor(query: SearchQuery): number[] {
  if (query.componentType === 'CPU') return [CEX_CATEGORIES.amdCpu.categoryId, CEX_CATEGORIES.intelCpu.categoryId];
  return [CEX_CATEGORIES.gpuPcie.categoryId];
}

function filterProducts(products: CexProduct[], query: SearchQuery): CexProduct[] {
  const keyword = query.keyword?.trim().toLowerCase();
  return products.filter((p) => {
    if (query.componentType === 'GPU' && p.raw.categoryId && p.raw.categoryId !== CEX_CATEGORIES.gpuPcie.categoryId) {
      return false;
    }
    if (query.maxItemPence && p.sell && p.sell.pence > query.maxItemPence) return false;
    if (query.vramGb && p.vramGb && p.vramGb !== query.vramGb) return false;
    if (keyword && !p.title.toLowerCase().includes(keyword) && !(p.normalisedModel ?? '').toLowerCase().includes(keyword)) {
      return false;
    }
    return true;
  });
}

export const cexProvider = new CexMarketplaceProvider();
