import type { SearchQuery } from '../search/types.ts';
import type { RawListing } from '../types/listing.ts';

export interface MarketplaceSearchResult {
  readonly items: readonly RawListing[];
  readonly total?: number;
  readonly nextOffset?: number;
  readonly integrationState: 'READY' | 'DEMO' | 'CONFIGURATION_REQUIRED' | 'NOT_IMPLEMENTED' | 'ERROR';
}

export interface MarketplaceProvider {
  readonly id: 'ebay' | 'facebook' | 'gumtree' | 'cex' | 'cashconverters';
  search(query: SearchQuery): Promise<MarketplaceSearchResult>;
  getListing(id: string): Promise<RawListing | null>;
}
