export const PC_DEAL_SCORE_V1 = 'PCDealScore-v1' as const;

export interface ScoreWeights {
  PRICE_VALUE: number;
  EXPECTED_PROFIT: number;
  ROI: number;
  COMPONENT_DEMAND: number;
  BUILD_USEFULNESS: number;
  SELLER_QUALITY: number;
  CONDITION_CONFIDENCE: number;
  AUCTION_OPPORTUNITY: number;
  SEARCH_RARITY: number;
  COMPATIBILITY: number;
  LIQUIDITY: number;
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
  PRICE_VALUE: 25,
  EXPECTED_PROFIT: 20,
  ROI: 10,
  COMPONENT_DEMAND: 10,
  BUILD_USEFULNESS: 10,
  SELLER_QUALITY: 7,
  CONDITION_CONFIDENCE: 5,
  AUCTION_OPPORTUNITY: 5,
  SEARCH_RARITY: 3,
  COMPATIBILITY: 3,
  LIQUIDITY: 2,
};

export function weightsTotal(weights: ScoreWeights): number {
  return Object.values(weights).reduce((a, b) => a + b, 0);
}

export function assertWeights(weights: ScoreWeights): void {
  const total = weightsTotal(weights);
  if (total !== 100) {
    throw new Error(`PCDealScore weights must total 100, received ${total}`);
  }
}

export interface FactorScore {
  readonly key: keyof ScoreWeights;
  readonly label: string;
  readonly awarded: number;
  readonly max: number;
  readonly reason: string;
}

export interface DealScoreResult {
  readonly version: typeof PC_DEAL_SCORE_V1 | string;
  readonly total: number;
  readonly band: 'EXCEPTIONAL' | 'STRONG_BUY' | 'GOOD' | 'WATCH' | 'WEAK' | 'PASS';
  readonly factors: readonly FactorScore[];
  readonly reasons: readonly string[];
  readonly risks: readonly string[];
  readonly recommendedAction: string;
  readonly whyThisIsADeal: string;
}

export function dealBand(total: number): DealScoreResult['band'] {
  if (total >= 90) return 'EXCEPTIONAL';
  if (total >= 80) return 'STRONG_BUY';
  if (total >= 70) return 'GOOD';
  if (total >= 60) return 'WATCH';
  if (total >= 40) return 'WEAK';
  return 'PASS';
}

export function bandLabel(band: DealScoreResult['band']): string {
  switch (band) {
    case 'EXCEPTIONAL':
      return 'EXCEPTIONAL';
    case 'STRONG_BUY':
      return 'STRONG BUY';
    case 'GOOD':
      return 'GOOD';
    case 'WATCH':
      return 'WATCH';
    case 'WEAK':
      return 'WEAK';
    case 'PASS':
      return 'PASS';
  }
}
