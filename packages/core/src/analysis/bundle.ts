import { add, money, type Money, ZERO } from '../money/money.ts';
import type { MarketValue, NormalisedComponent } from '../types/listing.ts';

export interface BundleValuation {
  readonly parts: readonly { model: string; type: string; value: Money | null }[];
  readonly estimatedPartOut: Money | null;
  readonly listingPrice: Money;
  readonly bundleDiscount: Money | null;
  readonly note: string;
}

export function valueBundle(
  component: NormalisedComponent,
  listingPrice: Money,
  lookup: (modelKeyOrName: string) => MarketValue | null,
): BundleValuation {
  const parts = (component.bundleParts.length ? component.bundleParts : [component]).map((part) => {
    const key = part.model.value ?? '';
    const market = key ? lookup(key) : null;
    return {
      model: key || 'unknown',
      type: part.componentType.value ?? 'UNKNOWN',
      value: market?.marketValue ?? null,
    };
  });
  const known = parts.filter((p) => p.value);
  const estimatedPartOut = known.length ? known.reduce((acc, p) => add(acc, p.value ?? ZERO), ZERO) : null;
  const bundleDiscount =
    estimatedPartOut && listingPrice.pence < estimatedPartOut.pence
      ? money(estimatedPartOut.pence - listingPrice.pence)
      : estimatedPartOut
        ? money(0)
        : null;
  return {
    parts,
    estimatedPartOut,
    listingPrice,
    bundleDiscount,
    note: estimatedPartOut
      ? 'Part-out uses price-book or labelled estimates only — never invented sold comps.'
      : 'INSUFFICIENT_DATA to value bundle parts.',
  };
}

export interface CompletePcValuation {
  readonly partOut: Money | null;
  readonly completePcResale: Money | null;
  readonly listingPrice: Money;
  readonly betterAs: 'PART_OUT' | 'COMPLETE_PC' | 'UNKNOWN';
}

export function valueCompletePc(
  listingPrice: Money,
  partOut: Money | null,
  completePcResale: Money | null,
): CompletePcValuation {
  let betterAs: CompletePcValuation['betterAs'] = 'UNKNOWN';
  if (partOut && completePcResale) {
    betterAs = completePcResale.pence >= partOut.pence ? 'COMPLETE_PC' : 'PART_OUT';
  }
  return { partOut, completePcResale, listingPrice, betterAs };
}
