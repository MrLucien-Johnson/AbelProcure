import { add, money, percentBps, sub, type Money, ZERO } from '../money/money.ts';
import type { LandedCostBreakdown, ProfitBreakdown, TargetBuy } from '../types/listing.ts';
import type { MarketValueKind } from '../types/enums.ts';

export interface LandedCostInput {
  itemPrice: Money;
  postage?: Money | null;
  buyerFees?: Money | null;
  collectionCost?: Money | null;
  expectedRepairCost?: Money | null;
}

export function calculateLandedCost(input: LandedCostInput): LandedCostBreakdown {
  const postage = input.postage ?? ZERO;
  const buyerFees = input.buyerFees ?? ZERO;
  const collectionCost = input.collectionCost ?? ZERO;
  const expectedRepairCost = input.expectedRepairCost ?? ZERO;
  const overridesApplied: string[] = [];
  if (input.postage) overridesApplied.push('postage');
  if (input.buyerFees) overridesApplied.push('buyerFees');
  if (input.collectionCost) overridesApplied.push('collectionCost');
  if (input.expectedRepairCost) overridesApplied.push('expectedRepairCost');
  return {
    itemPrice: input.itemPrice,
    postage,
    buyerFees,
    collectionCost,
    expectedRepairCost,
    landedCost: add(add(add(add(input.itemPrice, postage), buyerFees), collectionCost), expectedRepairCost),
    overridesApplied,
  };
}

export interface ProfitInput {
  expectedSalePrice: Money | null;
  landedCost: Money;
  sellingFeeBps?: number;
  outboundPostage?: Money;
  packagingCost?: Money;
  expectedRepairCost?: Money;
  salePriceKind?: MarketValueKind | null;
}

/**
 * Gross margin = expected sale − landed cost (before selling fees/postage/packaging).
 * Net margin / expected profit = sale − landed − selling fees − outbound postage − packaging − extra repair.
 */
export function calculateProfit(input: ProfitInput): ProfitBreakdown {
  const sellingFeeBps = input.sellingFeeBps ?? 1280;
  const outboundPostage = input.outboundPostage ?? money(495);
  const packagingCost = input.packagingCost ?? money(150);
  const expectedRepairCost = input.expectedRepairCost ?? ZERO;
  const sale = input.expectedSalePrice;

  if (!sale) {
    return {
      expectedSalePrice: null,
      landedCost: input.landedCost,
      sellingFees: ZERO,
      outboundPostage,
      packagingCost,
      expectedRepairCost,
      expectedProfit: null,
      grossMargin: null,
      netMargin: null,
      roiBps: null,
      salePriceKind: input.salePriceKind ?? null,
    };
  }

  const sellingFees = percentBps(sale, sellingFeeBps);
  const grossMargin = sub(sale, input.landedCost);
  const netMargin = sub(sub(sub(sub(sale, input.landedCost), sellingFees), outboundPostage), add(packagingCost, expectedRepairCost));
  const roiBps = input.landedCost.pence === 0 ? null : Math.round((netMargin.pence * 10_000) / input.landedCost.pence);

  return {
    expectedSalePrice: sale,
    landedCost: input.landedCost,
    sellingFees,
    outboundPostage,
    packagingCost,
    expectedRepairCost,
    expectedProfit: netMargin,
    grossMargin,
    netMargin,
    roiBps,
    salePriceKind: input.salePriceKind ?? null,
  };
}

export interface TargetBuyInput {
  expectedSalePrice: Money | null;
  minimumDesiredProfit: Money;
  sellingFeeBps?: number;
  outboundPostage?: Money;
  packagingCost?: Money;
  repairRiskReserve?: Money;
  postageOnPurchase?: Money;
  currentItemPrice?: Money;
  buildRemainingBudget?: Money | null;
}

export function calculateTargetBuy(input: TargetBuyInput): TargetBuy {
  if (!input.expectedSalePrice) {
    return {
      recommendedMaxLanded: null,
      recommendedMaxItemBid: null,
      buildMaxBuy: input.buildRemainingBudget ?? null,
      doNotChase: false,
      reason: 'No expected sale price — INSUFFICIENT_DATA. Will not invent a target.',
    };
  }
  const sellingFeeBps = input.sellingFeeBps ?? 1280;
  const outboundPostage = input.outboundPostage ?? money(495);
  const packagingCost = input.packagingCost ?? money(150);
  const repairRiskReserve = input.repairRiskReserve ?? ZERO;
  const fees = percentBps(input.expectedSalePrice, sellingFeeBps);
  const maxLanded = sub(
    sub(sub(sub(input.expectedSalePrice, input.minimumDesiredProfit), fees), outboundPostage),
    add(packagingCost, repairRiskReserve),
  );
  const postage = input.postageOnPurchase ?? ZERO;
  const maxItem = sub(maxLanded, postage);
  const doNotChase = input.currentItemPrice ? input.currentItemPrice.pence > maxItem.pence : false;
  return {
    recommendedMaxLanded: maxLanded.pence < 0 ? ZERO : maxLanded,
    recommendedMaxItemBid: maxItem.pence < 0 ? ZERO : maxItem,
    buildMaxBuy: input.buildRemainingBudget ?? null,
    doNotChase,
    reason: doNotChase
      ? 'Current price exceeds economic maximum. DO NOT CHASE.'
      : 'Target derived from expected sale, minimum profit, fees, postage, packaging and repair reserve.',
  };
}

export function discountBps(landed: Money, market: Money | null): number | null {
  if (!market || market.pence <= 0) return null;
  return Math.round(((market.pence - landed.pence) * 10_000) / market.pence);
}
