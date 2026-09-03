import { discountBps } from '../market/economics.ts';
import { formatGBP, type Money } from '../money/money.ts';
import type { Condition, ListingType } from '../types/enums.ts';
import type { MarketValue, NormalisedComponent, SellerInfo } from '../types/listing.ts';
import { assertWeights, bandLabel, dealBand, DEFAULT_WEIGHTS, PC_DEAL_SCORE_V1, type DealScoreResult, type FactorScore, type ScoreWeights } from './weights.ts';

export interface ScoreContext {
  landedCost: Money;
  market: MarketValue | null;
  expectedProfit: Money | null;
  roiBps: number | null;
  component: NormalisedComponent;
  seller: SellerInfo;
  condition: Condition;
  listingType: ListingType;
  bidCount: number | null;
  minutesRemaining: number | null;
  titleQuality: 'POOR' | 'OK' | 'GOOD';
  riskScore: number;
  searchRarity: number;
  buildUsefulness: number;
  compatibility: number;
  weights?: ScoreWeights;
  version?: string;
  mispriceFlag?: boolean;
}

export function scoreDeal(ctx: ScoreContext): DealScoreResult {
  const weights = ctx.weights ?? DEFAULT_WEIGHTS;
  assertWeights(weights);
  const version = ctx.version ?? PC_DEAL_SCORE_V1;

  const price = scorePriceValue(ctx, weights.PRICE_VALUE);
  const profit = scoreProfit(ctx, weights.EXPECTED_PROFIT);
  const roi = scoreRoi(ctx, weights.ROI);
  const demand = scale('COMPONENT_DEMAND', ctx.component.model.value ? demandHeuristic(ctx) : 3, weights.COMPONENT_DEMAND, 'Known demand for this model in 1080p/AM4 builds.');
  const build = scale('BUILD_USEFULNESS', ctx.buildUsefulness, weights.BUILD_USEFULNESS, buildReason(ctx.buildUsefulness));
  const seller = scoreSeller(ctx, weights.SELLER_QUALITY);
  const condition = scoreCondition(ctx, weights.CONDITION_CONFIDENCE);
  const auction = scoreAuction(ctx, weights.AUCTION_OPPORTUNITY);
  const rarity = scale('SEARCH_RARITY', ctx.searchRarity, weights.SEARCH_RARITY, rarityReason(ctx));
  const compatibility = scale('COMPATIBILITY', ctx.compatibility, weights.COMPATIBILITY, 'Socket/generation fit versus active builds.');
  const liquidity = scale('LIQUIDITY', liquidityHeuristic(ctx), weights.LIQUIDITY, 'How quickly this part typically resells when priced correctly.');

  const factors = [price, profit, roi, demand, build, seller, condition, auction, rarity, compatibility, liquidity];
  const total = round1(factors.reduce((sum, f) => sum + f.awarded, 0));
  const band = dealBand(total);
  const reasons = collectReasons(ctx, factors);
  const risks = collectRisks(ctx);
  const recommendedAction = recommend(total, ctx);

  return {
    version,
    total,
    band,
    factors,
    reasons,
    risks,
    recommendedAction,
    whyThisIsADeal: `Deal Score: ${total} (${bandLabel(band)}). ${reasons.slice(0, 3).join(' ')}`,
  };
}

function scorePriceValue(ctx: ScoreContext, max: number): FactorScore {
  if (!ctx.market?.marketValue || ctx.market.confidence === 'INSUFFICIENT_DATA') {
    return factor('PRICE_VALUE', 'Price value', 0.25 * max, max, 'INSUFFICIENT_DATA — will not treat asking prices as sold comps.');
  }
  const disc = discountBps(ctx.landedCost, ctx.market.marketValue);
  if (disc === null) {
    return factor('PRICE_VALUE', 'Price value', 0.2 * max, max, 'Market value missing.');
  }
  const pct = disc / 100;
  let unit = 0.45;
  if (pct >= 35) unit = 1;
  else if (pct >= 22) unit = 0.9;
  else if (pct >= 12) unit = 0.75;
  else if (pct >= 5) unit = 0.55;
  else if (pct >= 0) unit = 0.35;
  else if (pct >= -8) unit = 0.18;
  else unit = 0.05;
  if (ctx.market.confidence === 'LOW') unit *= 0.75;
  if (ctx.market.confidence === 'MEDIUM') unit *= 0.9;
  return factor('PRICE_VALUE', 'Price value', unit * max, max, `${pct.toFixed(1)}% vs ${ctx.market.kind.replaceAll('_', ' ').toLowerCase()} ${formatGBP(ctx.market.marketValue)}.`);
}

function scoreProfit(ctx: ScoreContext, max: number): FactorScore {
  if (!ctx.expectedProfit) {
    return factor('EXPECTED_PROFIT', 'Profit', 0.2 * max, max, 'No expected sale price — profit not invented.');
  }
  const p = ctx.expectedProfit.pence;
  let unit = 0.2;
  if (p >= 5000) unit = 1;
  else if (p >= 3500) unit = 0.88;
  else if (p >= 2000) unit = 0.72;
  else if (p >= 1000) unit = 0.5;
  else if (p >= 0) unit = 0.28;
  else unit = 0.05;
  if (ctx.riskScore >= 55) unit *= 0.75;
  return factor('EXPECTED_PROFIT', 'Profit', unit * max, max, `Net ${formatGBP(ctx.expectedProfit)} after fees/postage/packaging.`);
}

function scoreRoi(ctx: ScoreContext, max: number): FactorScore {
  if (ctx.roiBps === null) {
    return factor('ROI', 'ROI', 0.2 * max, max, 'ROI unavailable (missing sale price or zero landed cost).');
  }
  const pct = ctx.roiBps / 100;
  let unit = 0.2;
  if (pct >= 60) unit = 1;
  else if (pct >= 40) unit = 0.85;
  else if (pct >= 25) unit = 0.65;
  else if (pct >= 10) unit = 0.4;
  else if (pct >= 0) unit = 0.22;
  else unit = 0.05;
  return factor('ROI', 'ROI', unit * max, max, `ROI ${pct.toFixed(1)}% on landed cost.`);
}

function scoreSeller(ctx: ScoreContext, max: number): FactorScore {
  const pct = ctx.seller.feedbackPercentage;
  const score = ctx.seller.feedbackScore;
  if (pct === null && score === null) {
    return factor('SELLER_QUALITY', 'Seller', 0.45 * max, max, 'Seller metrics unavailable.');
  }
  let unit = 0.5;
  if (pct !== null && pct >= 99.4 && (score ?? 0) >= 200) unit = 0.95;
  else if (pct !== null && pct >= 98 && (score ?? 0) >= 50) unit = 0.82;
  else if (pct !== null && pct >= 97) unit = 0.6;
  else if (pct !== null && pct < 96) unit = 0.25;
  if (score !== null && score < 10) unit = Math.min(unit, 0.3);
  return factor('SELLER_QUALITY', 'Seller', unit * max, max, `Feedback ${pct ?? 'n/a'}% / ${score ?? 'n/a'} score.`);
}

function scoreCondition(ctx: ScoreContext, max: number): FactorScore {
  const map: Record<Condition, number> = {
    NEW: 1,
    OPEN_BOX: 0.92,
    CERTIFIED_REFURBISHED: 0.88,
    EXCELLENT_REFURBISHED: 0.84,
    VERY_GOOD_REFURBISHED: 0.8,
    GOOD_REFURBISHED: 0.74,
    SELLER_REFURBISHED: 0.7,
    USED_EXCELLENT: 0.78,
    USED_VERY_GOOD: 0.7,
    USED_GOOD: 0.58,
    USED_ACCEPTABLE: 0.4,
    FOR_PARTS: 0.15,
    UNKNOWN: 0.4,
  };
  let unit = map[ctx.condition];
  if (ctx.riskScore >= 70) unit *= 0.55;
  else if (ctx.riskScore >= 50) unit *= 0.75;
  return factor('CONDITION_CONFIDENCE', 'Condition', unit * max, max, `Condition ${ctx.condition.replaceAll('_', ' ')}.`);
}

function scoreAuction(ctx: ScoreContext, max: number): FactorScore {
  if (ctx.listingType === 'BUY_IT_NOW' || ctx.listingType === 'BEST_OFFER') {
    return factor('AUCTION_OPPORTUNITY', 'Auction opportunity', 0.35 * max, max, 'Not an auction — modest BIN/offer opportunity weight.');
  }
  const minutes = ctx.minutesRemaining;
  const bids = ctx.bidCount ?? 0;
  let unit = 0.4;
  if (minutes !== null && minutes <= 5 && bids <= 4) unit = 1;
  else if (minutes !== null && minutes <= 30 && bids <= 6) unit = 0.85;
  else if (minutes !== null && minutes <= 60) unit = 0.7;
  else if (minutes !== null && minutes <= 360) unit = 0.55;
  if (ctx.titleQuality === 'POOR' && bids <= 2) unit = Math.min(1, unit + 0.15);
  return factor('AUCTION_OPPORTUNITY', 'Auction opportunity', unit * max, max, auctionReason(minutes, bids, ctx.titleQuality));
}

function demandHeuristic(ctx: ScoreContext): number {
  const type = ctx.component.componentType.value;
  if (type === 'GPU') return 9;
  if (type === 'CPU') return 8;
  if (type === 'MOTHERBOARD') return 7.5;
  if (type === 'SSD') return 7;
  if (type === 'RAM') return 6.5;
  if (type === 'PSU') return ctx.component.psuTier.value === 'REPUTABLE' ? 7 : 4;
  if (type === 'BUNDLE' || type === 'COMPLETE_PC') return 8;
  return 4;
}

function liquidityHeuristic(ctx: ScoreContext): number {
  const type = ctx.component.componentType.value;
  if (type === 'GPU' || type === 'CPU' || type === 'SSD') return 8.5;
  if (type === 'RAM' || type === 'MOTHERBOARD') return 7;
  if (type === 'PSU') return ctx.component.psuTier.value === 'REPUTABLE' ? 6.5 : 3;
  return 5;
}

function scale(key: FactorScore['key'], unit0to10: number, max: number, reason: string): FactorScore {
  const unit = Math.min(10, Math.max(0, unit0to10)) / 10;
  return factor(key, key, unit * max, max, reason);
}

function factor(key: FactorScore['key'], label: string, awarded: number, max: number, reason: string): FactorScore {
  const labels: Record<string, string> = {
    PRICE_VALUE: 'Price value',
    EXPECTED_PROFIT: 'Profit',
    ROI: 'ROI',
    COMPONENT_DEMAND: 'Demand',
    BUILD_USEFULNESS: 'Build usefulness',
    SELLER_QUALITY: 'Seller',
    CONDITION_CONFIDENCE: 'Condition',
    AUCTION_OPPORTUNITY: 'Auction opportunity',
    SEARCH_RARITY: 'Rarity',
    COMPATIBILITY: 'Compatibility',
    LIQUIDITY: 'Liquidity',
  };
  return {
    key,
    label: labels[key] ?? label,
    awarded: round1(Math.min(max, Math.max(0, awarded))),
    max,
    reason,
  };
}

function collectReasons(ctx: ScoreContext, factors: FactorScore[]): string[] {
  const reasons: string[] = [];
  const disc = discountBps(ctx.landedCost, ctx.market?.marketValue ?? null);
  if (disc !== null && disc >= 1000 && ctx.market && ctx.market.confidence !== 'INSUFFICIENT_DATA') {
    reasons.push(`${(disc / 100).toFixed(0)}% below ${ctx.market.kind === 'USER_PRICE_BOOK' ? 'price-book' : 'market'} estimate.`);
  }
  if (ctx.mispriceFlag) reasons.push('Flagged POTENTIAL_MISPRICE (confidence sufficient).');
  if (ctx.expectedProfit && ctx.expectedProfit.pence > 0) {
    reasons.push(`Projected net ${formatGBP(ctx.expectedProfit)}.`);
  }
  if ((ctx.seller.feedbackPercentage ?? 0) >= 98) reasons.push('Low seller risk.');
  if (ctx.component.componentType.value === 'GPU') reasons.push('Desirable 1080p GPU class.');
  if (ctx.buildUsefulness >= 7) reasons.push('Highly useful for an active gaming PC build.');
  if (ctx.minutesRemaining !== null && ctx.minutesRemaining <= 60 && ctx.listingType !== 'BUY_IT_NOW') {
    reasons.push(`Auction ends in ${Math.max(0, Math.round(ctx.minutesRemaining))} minutes.`);
  }
  if ((ctx.bidCount ?? 99) <= 2 && ctx.listingType !== 'BUY_IT_NOW') reasons.push('Competition currently low.');
  if (reasons.length === 0) {
    reasons.push(factors[0]?.reason ?? 'Inspect factor breakdown.');
  }
  return reasons;
}

function collectRisks(ctx: ScoreContext): string[] {
  const risks: string[] = [];
  if (ctx.riskScore >= 40) risks.push(`Risk score ${ctx.riskScore}/100 — inspect description.`);
  if (ctx.condition === 'FOR_PARTS' || ctx.condition === 'UNKNOWN') risks.push('Condition uncertainty.');
  if (ctx.market?.confidence === 'LOW' || ctx.market?.confidence === 'INSUFFICIENT_DATA') {
    risks.push('Market evidence is weak; do not treat this as a verified sold comparable.');
  }
  if (ctx.titleQuality === 'POOR') risks.push('Poor title — opportunity if model is correct, risk if mis-parsed.');
  return risks;
}

function recommend(total: number, ctx: ScoreContext): string {
  if (ctx.listingType !== 'BUY_IT_NOW' && ctx.minutesRemaining !== null && ctx.minutesRemaining <= 15 && total >= 70) {
    return 'URGENT: watch the close. Set max bid at the recommended economic maximum. Do not exceed it.';
  }
  if (total >= 90) return 'EXCEPTIONAL — open the listing and consider immediate action within the target buy.';
  if (total >= 80) return 'STRONG BUY — watch/bid/BIN only up to recommended max.';
  if (total >= 70) return 'GOOD — add to watchlist; buy if it stays under target.';
  if (total >= 60) return 'WATCH — wait for price or more evidence.';
  return 'PASS or ignore unless you have a specific build gap.';
}

function auctionReason(minutes: number | null, bids: number, titleQuality: string): string {
  if (minutes === null) return `${bids} bids. End time unknown.`;
  return `${minutes}m remaining, ${bids} bids, title ${titleQuality.toLowerCase()}.`;
}

function rarityReason(ctx: ScoreContext): string {
  if (ctx.titleQuality === 'POOR') return 'Incomplete/misspelled title may hide this from other buyers.';
  return 'Search expansion / category mismatch contribution.';
}

function buildReason(value: number): string {
  if (value >= 8) return 'Fills a high-value gap in an active gaming PC build.';
  if (value >= 5) return 'Usable in inventory for 1080p gaming PCs.';
  return 'Limited contribution to current builds — scored mainly as a flip.';
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
