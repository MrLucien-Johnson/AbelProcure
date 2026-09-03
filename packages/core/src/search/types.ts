import type { ComponentType, Condition } from '../types/enums.ts';

export interface SearchQuery {
  readonly keyword?: string;
  readonly componentType?: ComponentType | '';
  readonly manufacturer?: string;
  readonly model?: string;
  readonly chipset?: string;
  readonly generation?: string;
  readonly vramGb?: number | null;
  readonly socket?: string;
  readonly ramGeneration?: string;
  readonly capacityGb?: number | null;
  readonly storageCapacityGb?: number | null;
  readonly psuWattage?: number | null;
  readonly formFactor?: string;
  readonly condition?: Condition | '';
  readonly maxItemPence?: number | null;
  readonly maxLandedPence?: number | null;
  readonly auctionOnly?: boolean;
  readonly buyItNowOnly?: boolean;
  readonly bestOffer?: boolean;
  readonly endingSoon?: boolean;
  readonly newlyListed?: boolean;
  readonly sellerFeedbackMin?: number | null;
  readonly ukOnly?: boolean;
  readonly collectionDistanceMiles?: number | null;
  readonly includePostage?: boolean;
  readonly excludeTerms?: string;
}

export const EMPTY_SEARCH: SearchQuery = {
  keyword: '',
  ukOnly: true,
  includePostage: true,
};
