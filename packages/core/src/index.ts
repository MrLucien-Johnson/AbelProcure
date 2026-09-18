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
export { facebookMarketplaceProvider, gumtreeMarketplaceProvider, cashConvertersProvider } from './marketplace/stubs.ts';
export { CexMarketplaceProvider, cexProvider, demoCexProducts } from './cex/provider.ts';
export {
  filterCexOpportunities,
  filterCexProducts,
  filterCexDiffs,
  matchesCexQuery,
  cexInventoryHaystack,
} from './cex/search.ts';
export { cexConfigFromEnv, CEX_CATEGORIES, DEFAULT_CEX_CONFIG, type CexProduct, type CexCollectionState, type CexConfig } from './cex/types.ts';
export { runCexScan, type CexScanResult } from './cex/scan.ts';
export { scoreOpportunity, sortOpportunities, DEFAULT_OPPORTUNITY_WEIGHTS, DEFAULT_THRESHOLDS, type CexOpportunity, type OpportunitySort } from './cex/opportunity.ts';
export { BUILD4, BUILD4_COST_BEFORE_GPU, GTX1080_BENCHMARK_LANDED, build4Profit, gtx1080BenchmarkProfit, classifyPsu, classifyCpuBalance } from './cex/profitability.ts';
export { DEMO_CEX_BOXES, DEMO_CEX_BOXES_RESPONSE } from './cex/fixtures.ts';
export { InMemorySnapshotStore, diffSnapshots, snapshotFromProduct } from './cex/snapshots.ts';
export { CexClient, CexCollectionError } from './cex/client.ts';
export { parseCexBoxesPayload, parseCexBoxesResponse, coerceCexImportPayload } from './cex/parse.ts';
export { boxToProduct, productUrlForBox } from './cex/normalise.ts';
export { performanceFor, GPU_PERFORMANCE } from './cex/performance.ts';
export { matchCompletePcs } from './cex/comparables.ts';
export { resolveCexMarketValue } from './cex/market.ts';
export { alertFromOpportunity, dedupeAlerts, cexAlertDedupeKey } from './cex/alerts.ts';
