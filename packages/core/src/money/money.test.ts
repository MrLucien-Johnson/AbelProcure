import { describe, expect, it } from 'vitest';
import { add, fromPounds, money, percentBps, formatGBP, ZERO, sub } from '../money/money.ts';
import { calculateLandedCost, calculateProfit, calculateTargetBuy } from '../market/economics.ts';

describe('money', () => {
  it('accepts £0', () => {
    expect(ZERO.pence).toBe(0);
    expect(formatGBP(ZERO)).toBe('£0.00');
  });

  it('parses pounds without float drift', () => {
    expect(fromPounds('12.50').pence).toBe(1250);
    expect(fromPounds(70).pence).toBe(7000);
    expect(fromPounds('-1.01').pence).toBe(-101);
  });

  it('rejects non-integer pence', () => {
    expect(() => money(10.5)).toThrow(/integer pence/);
  });

  it('adds postage', () => {
    expect(add(fromPounds(70), fromPounds('4.50')).pence).toBe(7450);
  });

  it('handles large values', () => {
    expect(add(fromPounds(99999), fromPounds('0.01')).pence).toBe(9_999_901);
  });

  it('allows negative profit', () => {
    expect(sub(fromPounds(10), fromPounds(25)).pence).toBe(-1500);
    expect(formatGBP(sub(fromPounds(10), fromPounds(25)))).toBe('-£15.00');
  });

  it('applies fee bps with nearest-pence rounding', () => {
    expect(percentBps(fromPounds(100), 1280).pence).toBe(1280);
    expect(percentBps(fromPounds('1.01'), 1280).pence).toBe(13);
  });
});

describe('landed cost and profit', () => {
  it('uses landed cost not just item price', () => {
    const landed = calculateLandedCost({
      itemPrice: fromPounds(70),
      postage: fromPounds(5),
    });
    expect(landed.landedCost.pence).toBe(7500);
  });

  it('computes gross vs net vs ROI separately', () => {
    const profit = calculateProfit({
      expectedSalePrice: fromPounds(125),
      landedCost: fromPounds('76.50'),
      sellingFeeBps: 1280,
      outboundPostage: fromPounds('4.95'),
      packagingCost: fromPounds('1.50'),
    });
    expect(profit.grossMargin?.pence).toBe(12500 - 7650);
    expect(profit.netMargin?.pence).toBeLessThan(profit.grossMargin?.pence ?? 0);
    expect(profit.roiBps).not.toBeNull();
    expect(profit.expectedProfit?.pence).toBe(profit.netMargin?.pence);
  });

  it('target buy and do-not-chase', () => {
    const target = calculateTargetBuy({
      expectedSalePrice: fromPounds(130),
      minimumDesiredProfit: fromPounds(35),
      sellingFeeBps: 1280,
      outboundPostage: fromPounds(10),
      packagingCost: fromPounds(4),
      postageOnPurchase: fromPounds(5),
      currentItemPrice: fromPounds(90),
    });
    expect(target.recommendedMaxItemBid).not.toBeNull();
    expect(target.doNotChase).toBe(true);
  });
});
