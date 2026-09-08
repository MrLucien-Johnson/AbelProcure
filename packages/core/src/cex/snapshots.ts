import type { CexConfig, CexInventoryEvent, CexProduct, CexSnapshotDiff, CexSnapshotRow } from './types.ts';

export function diffSnapshots(
  previous: CexSnapshotRow | undefined,
  current: CexSnapshotRow,
): CexSnapshotDiff {
  if (!previous) {
    return {
      boxId: current.boxId,
      event: 'NEW',
      previousSellPence: null,
      currentSellPence: current.sellPence,
    };
  }
  if (previous.outOfStock && !current.outOfStock) {
    return event('RESTOCKED', previous, current);
  }
  if (!previous.outOfStock && current.outOfStock) {
    return event('OUT_OF_STOCK', previous, current);
  }
  if (
    previous.sellPence !== null &&
    current.sellPence !== null &&
    current.sellPence < previous.sellPence
  ) {
    return event('PRICE_DROP', previous, current);
  }
  if (
    previous.sellPence !== null &&
    current.sellPence !== null &&
    current.sellPence > previous.sellPence
  ) {
    return event('PRICE_INCREASE', previous, current);
  }
  return event('UNCHANGED', previous, current);
}

function event(
  name: CexInventoryEvent,
  previous: CexSnapshotRow,
  current: CexSnapshotRow,
): CexSnapshotDiff {
  return {
    boxId: current.boxId,
    event: name,
    previousSellPence: previous.sellPence,
    currentSellPence: current.sellPence,
  };
}

export class InMemorySnapshotStore {
  private readonly latest = new Map<string, CexSnapshotRow>();
  readonly history: CexSnapshotRow[] = [];

  apply(row: CexSnapshotRow): CexSnapshotDiff {
    const prev = this.latest.get(row.boxId);
    const diff = diffSnapshots(prev, row);
    this.latest.set(row.boxId, row);
    const last = this.history.filter((h) => h.boxId === row.boxId).at(-1);
    const duplicate =
      last &&
      last.sellPence === row.sellPence &&
      last.outOfStock === row.outOfStock &&
      last.ecomQuantity === row.ecomQuantity;
    if (!duplicate) this.history.push(row);
    return diff;
  }

  get(boxId: string): CexSnapshotRow | undefined {
    return this.latest.get(boxId);
  }

  allLatest(): CexSnapshotRow[] {
    return [...this.latest.values()];
  }
}

export function shouldSkipPage(config: CexConfig, pageIndex: number): boolean {
  return pageIndex >= config.maxPagesPerRun;
}

export function snapshotFromProduct(product: CexProduct, observedAt = product.collectedAt): CexSnapshotRow {
  return {
    boxId: product.boxId,
    observedAt,
    sellPence: product.sell?.pence ?? null,
    cashPence: product.cash?.pence ?? null,
    voucherPence: product.voucher?.pence ?? null,
    outOfStock: product.availability === 'OUT_OF_STOCK',
    ecomQuantity: product.ecomQuantity,
  };
}
