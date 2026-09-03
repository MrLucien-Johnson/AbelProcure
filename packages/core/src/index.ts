export { money, fromPounds, add, sub, sum, percentBps, formatGBP, ZERO, type Money } from './money/money.ts';
export * from './types/enums.ts';
export type {
  FieldConfidence,
  NormalisedComponent,
  RawListing,
  ListingObservation,
  MarketValue,
  PriceBookEntry,
  LandedCostBreakdown,
  ProfitBreakdown,
  TargetBuy,
  SellerInfo,
} from './types/listing.ts';
export { ALL_CATALOG, GPU_MODELS, CPU_MODELS, MOTHERBOARD_CHIPSETS, findCatalogByKey } from './catalog/models.ts';
export { parseTitle, normaliseListingText, compactText } from './parsers/normalise.ts';
export { calculateLandedCost, calculateProfit, calculateTargetBuy, discountBps } from './market/economics.ts';
export { DEFAULT_WEIGHTS, PC_DEAL_SCORE_V1, assertWeights, weightsTotal, dealBand, bandLabel, type ScoreWeights, type DealScoreResult, type FactorScore } from './scoring/weights.ts';
export { scoreDeal, type ScoreContext } from './scoring/dealScore.ts';
export { evaluateListing, resolveMarketValue, modelKeyFromComponent, type EvaluatedDeal, type BuildSnapshot } from './scoring/evaluate.ts';
export { scoreRisk } from './risk/riskScore.ts';
export { analyseDescription, POSITIVE_KEYWORDS, NEGATIVE_KEYWORDS } from './analysis/description.ts';
export { valueBundle, valueCompletePc } from './analysis/bundle.ts';
export { expandSearch, expandKeyword, QUICK_FILTERS, SEARCH_PRESETS } from './search/expansion.ts';
export { EMPTY_SEARCH, type SearchQuery } from './search/types.ts';
export { suggestFromDecisions, type AlgorithmSuggestion, type DecisionRecord } from './learning/suggestions.ts';
export { minutesRemaining, formatCountdown, urgencyLevel, reminderAlertType, DEFAULT_AUCTION_REMINDERS_MINUTES } from './alerts/auctionTime.ts';
export {
  DEMO_LISTINGS,
  DEMO_PRICE_BOOK,
  EMPTY_PRODUCTION_PRICE_BOOK,
  DEMO_NOW_ISO,
  SCENARIO_A,
  SCENARIO_B,
  SCENARIO_C,
  SCENARIO_D,
  demoListing,
} from './fixtures/demo.ts';
export { DisabledBiddingProvider, BIDDING_STATUS } from './ebay/bidding.ts';
export { InAppNotificationProvider, UnconfiguredProvider, type NotificationProvider } from './notifications/channels.ts';
export type { MarketplaceProvider, MarketplaceSearchResult } from './marketplace/types.ts';
export { facebookMarketplaceProvider, gumtreeMarketplaceProvider, cexProvider, cashConvertersProvider } from './marketplace/stubs.ts';
