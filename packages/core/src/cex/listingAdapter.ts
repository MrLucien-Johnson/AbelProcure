import { money, ZERO } from '../money/money.ts';
import type { RawListing } from '../types/listing.ts';
import type { CexProduct } from './types.ts';

/** Map a CeX product into the shared listing shape without pretending it is an eBay item. */
export function cexProductToListing(product: CexProduct): RawListing {
  return {
    marketplace: 'cex',
    itemId: `cex:${product.boxId}`,
    legacyItemId: product.boxId,
    title: product.title,
    subtitle: product.normalisedModel,
    description: null,
    imageUrls: product.imageUrl ? [product.imageUrl] : [],
    stockImageLikely: true,
    itemWebUrl: product.productUrl ?? '',
    categoryId: product.raw.categoryId !== null ? String(product.raw.categoryId) : null,
    categoryPath: product.raw.categoryName,
    condition: 'USED_GOOD',
    conditionText: 'CeX graded used stock',
    listingType: 'BUY_IT_NOW',
    buyingOptions: ['FIXED_PRICE'],
    itemPrice: product.sell ?? ZERO,
    postage: money(0),
    collectionOnly: product.availability === 'STORE_ONLY',
    collectionDistanceMiles: null,
    bidCount: null,
    currentBid: null,
    endTime: null,
    listedAt: product.collectedAt,
    seller: {
      username: 'CeX UK',
      feedbackScore: null,
      feedbackPercentage: null,
      topRated: null,
    },
    itemLocation: 'United Kingdom',
    returnsAccepted: null,
    country: 'GB',
    dataSource: product.dataSource === 'CEX_WEBUY_API' || product.dataSource === 'CEX_STOREFRONT_SEARCH' || product.dataSource === 'CEX_IMPORT' || product.dataSource === 'DEMO_SYNTHETIC'
      ? product.dataSource
      : 'USER_ENTERED',
    firstSeenAt: product.collectedAt,
    lastSeenAt: product.collectedAt,
  };
}
