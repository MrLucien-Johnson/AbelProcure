export const DATA_SOURCES = ['DEMO_SYNTHETIC', 'EBAY_BROWSE', 'USER_ENTERED', 'CEX_WEBUY_API', 'CEX_IMPORT'] as const;
export type DataSource = (typeof DATA_SOURCES)[number];

export const MARKET_VALUE_KINDS = ['ACTIVE_LISTING_ESTIMATE', 'VERIFIED_SOLD_PRICE_DATA', 'USER_PRICE_BOOK'] as const;
export type MarketValueKind = (typeof MARKET_VALUE_KINDS)[number];

export const CONFIDENCE_LEVELS = ['HIGH', 'MEDIUM', 'LOW', 'INSUFFICIENT_DATA'] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

export const INTEGRATION_STATES = [
  'READY',
  'DEGRADED',
  'CONFIGURATION_REQUIRED',
  'EBAY_PERMISSION_REQUIRED',
  'EBAY_CREDENTIALS_REQUIRED',
  'EBAY_USER_AUTHORIZATION_REQUIRED',
  'DISABLED_PENDING_EBAY_APPROVAL',
  'DEMO',
  'ERROR',
  'NOT_IMPLEMENTED',
] as const;
export type IntegrationState = (typeof INTEGRATION_STATES)[number];

export const COMPONENT_TYPES = [
  'GPU',
  'CPU',
  'MOTHERBOARD',
  'RAM',
  'SSD',
  'HDD',
  'PSU',
  'CASE',
  'COOLER',
  'WIFI',
  'COMPLETE_PC',
  'BUNDLE',
  'UNKNOWN',
] as const;
export type ComponentType = (typeof COMPONENT_TYPES)[number];

export const LISTING_TYPES = ['AUCTION', 'BUY_IT_NOW', 'BEST_OFFER', 'AUCTION_WITH_BIN'] as const;
export type ListingType = (typeof LISTING_TYPES)[number];

export const CONDITIONS = [
  'NEW',
  'OPEN_BOX',
  'CERTIFIED_REFURBISHED',
  'EXCELLENT_REFURBISHED',
  'VERY_GOOD_REFURBISHED',
  'GOOD_REFURBISHED',
  'SELLER_REFURBISHED',
  'USED_EXCELLENT',
  'USED_VERY_GOOD',
  'USED_GOOD',
  'USED_ACCEPTABLE',
  'FOR_PARTS',
  'UNKNOWN',
] as const;
export type Condition = (typeof CONDITIONS)[number];

export const DEAL_BANDS = ['EXCEPTIONAL', 'STRONG_BUY', 'GOOD', 'WATCH', 'WEAK', 'PASS'] as const;
export type DealBand = (typeof DEAL_BANDS)[number];

export const INVENTORY_STATUSES = [
  'WATCHING',
  'ORDERED',
  'DELIVERED',
  'TESTING',
  'AVAILABLE',
  'ALLOCATED',
  'LISTED',
  'SOLD',
  'FAULTY',
  'RETURNED',
] as const;
export type InventoryStatus = (typeof INVENTORY_STATUSES)[number];

export const FEEDBACK_ACTIONS = [
  'BUY',
  'WATCH',
  'BID',
  'GOOD_DEAL',
  'TOO_EXPENSIVE',
  'BAD_SELLER',
  'WRONG_COMPONENT',
  'BAD_CONDITION',
  'NOT_PROFITABLE',
  'NOT_INTERESTED',
  'PURCHASED',
  'MISSED',
  'IGNORE',
] as const;
export type FeedbackAction = (typeof FEEDBACK_ACTIONS)[number];

export const AUCTION_TRACK_STATUSES = [
  'ENDING_SOON',
  'CURRENTLY_WINNING',
  'OUTBID',
  'WATCHING',
  'BID_PLANNED',
  'WON',
  'LOST',
  'ENDED',
] as const;
export type AuctionTrackStatus = (typeof AUCTION_TRACK_STATUSES)[number];

export const ALERT_TYPES = [
  'AUCTION_ENDING_24H',
  'AUCTION_ENDING_6H',
  'AUCTION_ENDING_1H',
  'AUCTION_ENDING_30M',
  'AUCTION_ENDING_15M',
  'AUCTION_ENDING_5M',
  'AUCTION_ENDING_2M',
  'PRICE_ABOVE_TARGET',
  'MAX_BID_EXCEEDED',
  'OUTBID',
  'AUCTION_WON',
  'AUCTION_LOST',
  'NEW_BARGAIN_FOUND',
  'BUY_IT_NOW_BELOW_TARGET',
  'PRICE_REDUCED',
  'SELLER_OFFER_RECEIVED',
  'COUNTER_OFFER_RECEIVED',
  'NEW_DEAL_SCORE_90_PLUS',
  'DO_NOT_CHASE',
  'CEX_GPU_BARGAIN',
  'CEX_SIGNIFICANT_BARGAIN',
  'CEX_NEW',
  'CEX_RESTOCKED',
  'CEX_PRICE_DROP',
  'CEX_BUILD4_PROFIT_THRESHOLD',
] as const;
export type AlertType = (typeof ALERT_TYPES)[number];

export const ALGORITHM_VERSION = 'PCDealScore-v1' as const;
export type AlgorithmVersionId = typeof ALGORITHM_VERSION | `PCDealScore-v${string}`;
