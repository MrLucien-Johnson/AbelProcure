import type { MarketplaceProvider, MarketplaceSearchResult } from '../marketplace/types.ts';
import type { SearchQuery } from '../search/types.ts';
import type { RawListing } from '../types/listing.ts';
import { CexClient, CexCollectionError } from './client.ts';
import { boxToProduct } from './normalise.ts';
import { DEMO_CEX_BOXES } from './fixtures.ts';
import { cexProductToListing } from './listingAdapter.ts';
import { filterCexProducts } from './search.ts';
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
      const keyword = query.keyword?.trim() ?? '';
      const products = keyword
        ? await this.fetchLive(categoryIdsFor(query), keyword)
        : await this.loadProducts(categoryIdsFor(query));
      const filtered = filterCexProducts(products, query);
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
    const products = await this.fetchLive(categoryIds, undefined);
    this.cache = { expires: now + this.config.cacheTtlMs, products };
    return products;
  }

  private async fetchLive(categoryIds: number[], q?: string): Promise<CexProduct[]> {
    if (!this.config.enabled) {
      throw new CexCollectionError('CEX_ENABLED=false', 'DISABLED');
    }
    const collectedAt = new Date().toISOString();
    const page = await this.client.collectLive({ categoryIds, q });
    const fromStorefront = this.client.lastChannel === 'STOREFRONT_SEARCH';
    return page.boxes.map((box) =>
      boxToProduct(box, {
        collectedAt,
        dataSource: fromStorefront ? 'CEX_STOREFRONT_SEARCH' : 'CEX_WEBUY_API',
        collectionState: 'LIVE',
        storefront: this.config.storefrontBaseUrl,
      }),
    );
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

export const cexProvider = new CexMarketplaceProvider();
