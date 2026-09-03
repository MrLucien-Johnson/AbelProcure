import { analyseDescription } from '../analysis/description.ts';
import { valueBundle, valueCompletePc } from '../analysis/bundle.ts';
import { minutesRemaining } from '../alerts/auctionTime.ts';
import { findCatalogByKey, ALL_CATALOG } from '../catalog/models.ts';
import { calculateLandedCost, calculateProfit, calculateTargetBuy, discountBps } from '../market/economics.ts';
import { money, mulInt, percentBps, type Money, ZERO } from '../money/money.ts';
import { parseTitle } from '../parsers/normalise.ts';
import { scoreRisk } from '../risk/riskScore.ts';
import { scoreDeal } from '../scoring/dealScore.ts';
import { dealBand } from '../scoring/weights.ts';
import type { LandedCostBreakdown, MarketValue, PriceBookEntry, ProfitBreakdown, RawListing, TargetBuy, NormalisedComponent } from '../types/listing.ts';
import type { DealScoreResult } from '../scoring/weights.ts';

export interface BuildSnapshot {
  readonly id: string;
  readonly name: string;
  readonly missingTypes: readonly string[];
  readonly partsCost: Money;
  readonly projectedResale: Money | null;
  readonly targetMargin: Money;
}

export interface EvaluatedDeal {
  readonly listing: RawListing;
  readonly component: NormalisedComponent;
  readonly landed: LandedCostBreakdown;
  readonly market: MarketValue;
  readonly profit: ProfitBreakdown;
  readonly target: TargetBuy;
  readonly score: DealScoreResult;
  readonly riskScore: number;
  readonly riskSignals: readonly string[];
  readonly descriptionHits: ReturnType<typeof analyseDescription>;
  readonly listingAgeMinutes: number | null;
  readonly isNew: boolean;
  readonly possibleRelist: boolean;
  readonly potentialMisprice: boolean;
  readonly auctionOpportunity: number;
  readonly buildImpact: {
    readonly buildId: string;
    readonly buildName: string;
    readonly partsCostBefore: Money;
    readonly partsCostAfter: Money;
    readonly projectedResale: Money | null;
    readonly projectedGross: Money | null;
  } | null;
  readonly bundle: ReturnType<typeof valueBundle> | null;
  readonly completePc: ReturnType<typeof valueCompletePc> | null;
}

export interface EvaluateOptions {
  now?: string;
  priceBook?: readonly PriceBookEntry[];
  builds?: readonly BuildSnapshot[];
  knownItemIds?: ReadonlySet<string>;
  similarTitles?: readonly { itemId: string; title: string; seller: string }[];
  sellingFeeBps?: number;
  mispriceThresholdBps?: number;
}

export function evaluateListing(listing: RawListing, options: EvaluateOptions = {}): EvaluatedDeal {
  const now = options.now ?? listing.lastSeenAt;
  const component = parseTitle(`${listing.title} ${listing.description ?? ''}`);
  const repairFromRisk = listing.condition === 'FOR_PARTS' ? money(2500) : ZERO;
  const landed = calculateLandedCost({
    itemPrice: listing.itemPrice,
    postage: listing.postage,
    collectionCost: listing.collectionOnly ? money(800) : ZERO,
    expectedRepairCost: repairFromRisk,
  });
  const market = resolveMarketValue(component, options.priceBook ?? []);
  const risk = scoreRisk({
    component,
    seller: listing.seller,
    condition: listing.condition,
    title: listing.title,
    description: listing.description,
    imageCount: listing.imageUrls.length,
    stockImageLikely: listing.stockImageLikely,
    collectionOnly: listing.collectionOnly,
    returnsAccepted: listing.returnsAccepted,
    listingType: listing.listingType,
  });
  const salePrice = market.normalSaleValue ?? market.marketValue;
  const profit = calculateProfit({
    expectedSalePrice: salePrice,
    landedCost: landed.landedCost,
    sellingFeeBps: options.sellingFeeBps,
    expectedRepairCost: repairFromRisk,
    salePriceKind: market.kind,
  });
  const riskAdjustedProfit =
    profit.expectedProfit && risk.riskAdjustedProfitFactor !== 1
      ? money(Math.round(profit.expectedProfit.pence * risk.riskAdjustedProfitFactor))
      : profit.expectedProfit;

  const build = pickBuild(component, options.builds ?? [], landed.landedCost);
  const minProfit = money(3500);
  const target = calculateTargetBuy({
    expectedSalePrice: salePrice,
    minimumDesiredProfit: minProfit,
    sellingFeeBps: options.sellingFeeBps,
    postageOnPurchase: listing.postage ?? ZERO,
    currentItemPrice: listing.itemPrice,
    buildRemainingBudget: build ? money(Math.max(0, (build.projectedResale?.pence ?? 0) - build.partsCost.pence - 8000)) : null,
    repairRiskReserve: repairFromRisk,
  });

  const mins = minutesRemaining(listing.endTime, now);
  const buildUsefulness = build ? 9 : component.componentType.value === 'GPU' || component.componentType.value === 'CPU' ? 6.5 : 4;
  const compatibility = socketUseful(component, options.builds ?? []) ? 9 : 5;
  const searchRarity = component.titleQuality === 'POOR' ? 8 : listing.categoryPath?.toLowerCase().includes('computer') ? 4 : 7;
  const disc = discountBps(landed.landedCost, market.marketValue);
  const potentialMisprice =
    disc !== null &&
    disc >= (options.mispriceThresholdBps ?? 2500) &&
    (market.confidence === 'HIGH' || market.confidence === 'MEDIUM');

  const score = scoreDeal({
    landedCost: landed.landedCost,
    market,
    expectedProfit: riskAdjustedProfit,
    roiBps: profit.roiBps,
    component,
    seller: listing.seller,
    condition: listing.condition,
    listingType: listing.listingType,
    bidCount: listing.bidCount,
    minutesRemaining: mins,
    titleQuality: component.titleQuality,
    riskScore: risk.score,
    searchRarity,
    buildUsefulness,
    compatibility,
    mispriceFlag: potentialMisprice,
  });

  const first = Date.parse(listing.firstSeenAt);
  const last = Date.parse(now);
  const listingAgeMinutes = Number.isNaN(first) || Number.isNaN(last) ? null : Math.round((last - first) / 60_000);
  const isNew = !options.knownItemIds?.has(listing.itemId);
  const possibleRelist = detectPossibleRelist(listing, options.similarTitles ?? []);

  const lookup = (name: string) => {
    const entry = (options.priceBook ?? []).find((p) => p.displayName === name || p.modelKey === name);
    return entry ? priceBookToMarket(entry) : null;
  };
  const bundle = component.isBundle || component.isCompletePc ? valueBundle(component, listing.itemPrice, lookup) : null;
  const completePc = component.isCompletePc
    ? valueCompletePc(listing.itemPrice, bundle?.estimatedPartOut ?? null, salePrice ? mulInt(salePrice, 1) : null)
    : null;

  return {
    listing,
    component,
    landed,
    market,
    profit: { ...profit, expectedProfit: riskAdjustedProfit },
    target,
    score,
    riskScore: risk.score,
    riskSignals: risk.signals,
    descriptionHits: analyseDescription(listing.description ?? listing.title),
    listingAgeMinutes,
    isNew,
    possibleRelist,
    potentialMisprice,
    auctionOpportunity: score.factors.find((f) => f.key === 'AUCTION_OPPORTUNITY')?.awarded ?? 0,
    buildImpact: build
      ? {
          buildId: build.id,
          buildName: build.name,
          partsCostBefore: build.partsCost,
          partsCostAfter: money(build.partsCost.pence + landed.landedCost.pence),
          projectedResale: build.projectedResale,
          projectedGross: build.projectedResale
            ? money(build.projectedResale.pence - build.partsCost.pence - landed.landedCost.pence)
            : null,
        }
      : null,
    bundle,
    completePc,
  };
}

export function resolveMarketValue(component: NormalisedComponent, book: readonly PriceBookEntry[]): MarketValue {
  const model = component.model.value;
  const entry = book.find((p) => p.displayName === model || p.modelKey === modelKeyFromComponent(component));
  if (entry?.expectedResalePrice) {
    return priceBookToMarket(entry);
  }
  return {
    modelKey: modelKeyFromComponent(component),
    kind: 'ACTIVE_LISTING_ESTIMATE',
    confidence: 'INSUFFICIENT_DATA',
    marketValue: null,
    quickSaleValue: null,
    normalSaleValue: null,
    optimisticValue: null,
    targetPurchasePrice: null,
    sampleSize: 0,
    lastUpdated: null,
    notes: 'No price-book value and no verified sold-price API. Asking prices are not treated as sold comps.',
  };
}

export function priceBookToMarket(entry: PriceBookEntry): MarketValue {
  const resale = entry.expectedResalePrice;
  return {
    modelKey: entry.modelKey,
    kind: 'USER_PRICE_BOOK',
    confidence: entry.confidence,
    marketValue: resale,
    quickSaleValue: resale ? percentBps(resale, 9000) : null,
    normalSaleValue: resale,
    optimisticValue: resale ? percentBps(resale, 11000) : null,
    targetPurchasePrice: entry.desiredBuyPrice,
    sampleSize: 1,
    lastUpdated: entry.lastUpdated,
    notes: entry.notes,
  };
}

export function modelKeyFromComponent(component: NormalisedComponent): string {
  const model = component.model.value;
  if (!model) return 'unknown';
  const catalog = ALL_CATALOG.find((m) => m.model === model);
  return catalog?.key ?? model.toLowerCase().replaceAll(' ', '-');
}

function pickBuild(component: NormalisedComponent, builds: readonly BuildSnapshot[], _landed: Money): BuildSnapshot | null {
  const type = component.componentType.value;
  if (!type) return null;
  return builds.find((b) => b.missingTypes.includes(type)) ?? null;
}

function socketUseful(component: NormalisedComponent, builds: readonly BuildSnapshot[]): boolean {
  if (builds.length === 0) return component.socket.value === 'AM4' || component.componentType.value === 'GPU';
  return true;
}

function detectPossibleRelist(
  listing: RawListing,
  similar: readonly { itemId: string; title: string; seller: string }[],
): boolean {
  return similar.some(
    (row) =>
      row.itemId !== listing.itemId &&
      row.seller === (listing.seller.username ?? '') &&
      similarTitle(row.title, listing.title),
  );
}

function similarTitle(a: string, b: string): boolean {
  const na = a.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const nb = b.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (na === nb) return true;
  const wa = new Set(na.split(' '));
  const wb = nb.split(' ');
  const overlap = wb.filter((w) => wa.has(w)).length;
  return overlap / Math.max(wb.length, 1) > 0.82;
}

export { dealBand, findCatalogByKey };
