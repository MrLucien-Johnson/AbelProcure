import type { MarketplaceProvider } from './types.ts';

export class NotImplementedMarketplace implements MarketplaceProvider {
  constructor(
    readonly id: MarketplaceProvider['id'],
    private readonly label: string,
  ) {}

  async search(): Promise<never> {
    throw Object.assign(new Error(`${this.label} is NOT_IMPLEMENTED. No unofficial scraping.`), {
      code: 'NOT_IMPLEMENTED',
    });
  }

  async getListing(): Promise<never> {
    throw Object.assign(new Error(`${this.label} is NOT_IMPLEMENTED. No unofficial scraping.`), {
      code: 'NOT_IMPLEMENTED',
    });
  }
}

export const facebookMarketplaceProvider = new NotImplementedMarketplace('facebook', 'FacebookMarketplaceProvider');
export const gumtreeMarketplaceProvider = new NotImplementedMarketplace('gumtree', 'GumtreeMarketplaceProvider');
export const cashConvertersProvider = new NotImplementedMarketplace('cashconverters', 'CashConvertersProvider');
