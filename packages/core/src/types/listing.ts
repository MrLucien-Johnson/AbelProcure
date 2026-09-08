import type { Money } from '../money/money.ts';
import type {
  ComponentType,
  Condition,
  ConfidenceLevel,
  DataSource,
  ListingType,
  MarketValueKind,
} from './enums.ts';

export interface FieldConfidence<T> {
  readonly value: T | null;
  readonly confidence: number;
  readonly evidence: string;
}

export interface NormalisedComponent {
  readonly componentType: FieldConfidence<ComponentType>;
  readonly manufacturer: FieldConfidence<string>;
  readonly series: FieldConfidence<string>;
  readonly model: FieldConfidence<string>;
  readonly variant: FieldConfidence<string>;
  readonly chipset: FieldConfidence<string>;
  readonly socket: FieldConfidence<string>;
  readonly generation: FieldConfidence<string>;
  readonly vramGb: FieldConfidence<number>;
  readonly memoryType: FieldConfidence<string>;
  readonly ramGeneration: FieldConfidence<string>;
  readonly capacityGb: FieldConfidence<number>;
  readonly wattage: FieldConfidence<number>;
  readonly formFactor: FieldConfidence<string>;
  readonly psuTier: FieldConfidence<'REPUTABLE' | 'GENERIC_UNKNOWN' | 'UNSAFE_SUSPECT'>;
  readonly bundleParts: readonly NormalisedComponent[];
  readonly isCompletePc: boolean;
  readonly isBundle: boolean;
  readonly titleQuality: 'POOR' | 'OK' | 'GOOD';
}

export interface SellerInfo {
  readonly username: string | null;
  readonly feedbackScore: number | null;
  readonly feedbackPercentage: number | null;
  readonly topRated: boolean | null;
}

export interface RawListing {
  readonly marketplace: 'ebay' | 'cex';
  readonly itemId: string;
  readonly legacyItemId: string | null;
  readonly title: string;
  readonly subtitle: string | null;
  readonly description: string | null;
  readonly imageUrls: readonly string[];
  readonly stockImageLikely: boolean;
  readonly itemWebUrl: string;
  readonly categoryId: string | null;
  readonly categoryPath: string | null;
  readonly condition: Condition;
  readonly conditionText: string | null;
  readonly listingType: ListingType;
  readonly buyingOptions: readonly string[];
  readonly itemPrice: Money;
  readonly postage: Money | null;
  readonly collectionOnly: boolean;
  readonly collectionDistanceMiles: number | null;
  readonly bidCount: number | null;
  readonly currentBid: Money | null;
  readonly endTime: string | null;
  readonly listedAt: string | null;
  readonly seller: SellerInfo;
  readonly itemLocation: string | null;
  readonly returnsAccepted: boolean | null;
  readonly country: string | null;
  readonly dataSource: DataSource;
  readonly firstSeenAt: string;
  readonly lastSeenAt: string;
}

export interface ListingObservation {
  readonly id: string;
  readonly itemId: string;
  readonly observedAt: string;
  readonly itemPrice: Money;
  readonly postage: Money | null;
  readonly bidCount: number | null;
  readonly endTime: string | null;
  readonly buyingOptions: readonly string[];
  readonly title: string;
}

export interface MarketValue {
  readonly modelKey: string;
  readonly kind: MarketValueKind;
  readonly confidence: ConfidenceLevel;
  readonly marketValue: Money | null;
  readonly quickSaleValue: Money | null;
  readonly normalSaleValue: Money | null;
  readonly optimisticValue: Money | null;
  readonly targetPurchasePrice: Money | null;
  readonly sampleSize: number;
  readonly lastUpdated: string | null;
  readonly notes: string;
}

export interface PriceBookEntry {
  readonly modelKey: string;
  readonly componentType: ComponentType;
  readonly displayName: string;
  readonly desiredBuyPrice: Money | null;
  readonly absoluteMaxBuyPrice: Money | null;
  readonly expectedResalePrice: Money | null;
  readonly minimumAcceptableProfit: Money | null;
  readonly minimumAcceptableRoiBps: number | null;
  readonly confidence: ConfidenceLevel;
  readonly lastUpdated: string | null;
  readonly notes: string;
}

export interface LandedCostBreakdown {
  readonly itemPrice: Money;
  readonly postage: Money;
  readonly buyerFees: Money;
  readonly collectionCost: Money;
  readonly expectedRepairCost: Money;
  readonly landedCost: Money;
  readonly overridesApplied: readonly string[];
}

export interface ProfitBreakdown {
  readonly expectedSalePrice: Money | null;
  readonly landedCost: Money;
  readonly sellingFees: Money;
  readonly outboundPostage: Money;
  readonly packagingCost: Money;
  readonly expectedRepairCost: Money;
  readonly expectedProfit: Money | null;
  readonly grossMargin: Money | null;
  readonly netMargin: Money | null;
  readonly roiBps: number | null;
  readonly salePriceKind: MarketValueKind | null;
}

export interface TargetBuy {
  readonly recommendedMaxLanded: Money | null;
  readonly recommendedMaxItemBid: Money | null;
  readonly buildMaxBuy: Money | null;
  readonly doNotChase: boolean;
  readonly reason: string;
}
