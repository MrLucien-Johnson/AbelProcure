/**
 * Official bidding stays disabled until eBay grants Offer API production access.
 * Human remains in control of every bid.
 */
export const BIDDING_STATUS = 'DISABLED_PENDING_EBAY_APPROVAL' as const;

export interface BidPlan {
  readonly itemId: string;
  readonly myMaxBid: import('../money/money.ts').Money | null;
  readonly recommendedMaxBid: import('../money/money.ts').Money | null;
  readonly manuallyBid: boolean;
  readonly doNotChase: boolean;
}

export interface BiddingProvider {
  readonly status: typeof BIDDING_STATUS | 'READY';
  placeProxyBid?(itemId: string, maxAmount: import('../money/money.ts').Money): Promise<never>;
  getBidding?(itemId: string): Promise<unknown>;
}

export class DisabledBiddingProvider implements BiddingProvider {
  readonly status = BIDDING_STATUS;
  async placeProxyBid(): Promise<never> {
    throw Object.assign(new Error('Automatic bidding is DISABLED_PENDING_EBAY_APPROVAL. Use eBay in a browser.'), {
      code: BIDDING_STATUS,
    });
  }
}
