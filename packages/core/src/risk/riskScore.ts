import type { Condition, ListingType } from '../types/enums.ts';
import type { NormalisedComponent, SellerInfo } from '../types/listing.ts';
import { analyseDescription } from '../analysis/description.ts';

export interface RiskInput {
  component: NormalisedComponent;
  seller: SellerInfo;
  condition: Condition;
  title: string;
  description: string | null;
  imageCount: number;
  stockImageLikely: boolean;
  collectionOnly: boolean;
  returnsAccepted: boolean | null;
  listingType: ListingType;
}

export interface RiskResult {
  readonly score: number;
  readonly signals: readonly string[];
  readonly riskAdjustedProfitFactor: number;
}

export function scoreRisk(input: RiskInput): RiskResult {
  const signals: string[] = [];
  let score = 8;
  const desc = analyseDescription(`${input.title}\n${input.description ?? ''}`);

  if ((input.seller.feedbackPercentage ?? 100) < 97) {
    score += 18;
    signals.push('Seller feedback unusually low');
  }
  if ((input.seller.feedbackScore ?? 999) < 15) {
    score += 12;
    signals.push('Seller account appears inexperienced');
  }
  for (const phrase of desc.negative) {
    score += phrase.includes('bent') || phrase.includes('artefact') || phrase.includes('fault') ? 16 : 10;
    signals.push(`Negative keyword: ${phrase}`);
  }
  if (input.condition === 'FOR_PARTS') {
    score += 22;
    signals.push('Listed for parts / not working');
  }
  if (input.returnsAccepted === false) {
    score += 8;
    signals.push('No returns');
  }
  if (input.imageCount <= 1) {
    score += 7;
    signals.push('Only one image');
  }
  if (input.stockImageLikely) {
    score += 10;
    signals.push('Stock image only');
  }
  if (input.collectionOnly) {
    score += 6;
    signals.push('Collection only');
  }
  if (input.component.psuTier.value === 'GENERIC_UNKNOWN' || input.component.psuTier.value === 'UNSAFE_SUSPECT') {
    score += 18;
    signals.push('Unknown or generic PSU brand');
  }
  if (input.component.titleQuality === 'POOR' && input.component.componentType.value === 'UNKNOWN') {
    score += 10;
    signals.push('Suspiciously vague description');
  }
  if (!input.component.model.value && input.component.componentType.value !== 'BUNDLE') {
    score += 8;
    signals.push('Incomplete specifications');
  }

  score = Math.min(100, Math.max(0, score));
  const riskAdjustedProfitFactor = score >= 70 ? 0.45 : score >= 50 ? 0.7 : score >= 30 ? 0.88 : 1;
  return { score, signals, riskAdjustedProfitFactor };
}
