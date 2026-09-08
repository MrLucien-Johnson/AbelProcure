import { GPU_MODELS } from '../catalog/models.ts';
import { GPU_MODELS_EXTENDED } from '../catalog/gpuExtended.ts';
import { parseTitle } from '../parsers/normalise.ts';
import type { CexBox, CexCollectionState, CexConfig, CexProduct } from './types.ts';
import { poundsToMoney } from './types.ts';

const GPU_CATALOG = [...GPU_MODELS, ...GPU_MODELS_EXTENDED];

export function productUrlForBox(storefront: string, boxId: string): string {
  const base = storefront.replace(/\/$/, '');
  return `${base}/product-detail?id=${encodeURIComponent(boxId)}`;
}

export function resolveGpuCatalog(parsedModel: string | null, vramGb: number | null) {
  if (!parsedModel) return null;
  if (parsedModel === 'RTX 3060' && vramGb === 8) {
    return GPU_CATALOG.find((m) => m.key === 'rtx-3060-8gb') ?? null;
  }
  if (parsedModel === 'RTX 3060 8GB') {
    return GPU_CATALOG.find((m) => m.key === 'rtx-3060-8gb') ?? null;
  }
  return GPU_CATALOG.find((m) => m.model === parsedModel) ?? GPU_CATALOG.find((m) => m.displayName === parsedModel) ?? null;
}

export function boxToProduct(
  box: CexBox,
  opts: { collectedAt: string; dataSource: CexProduct['dataSource']; collectionState: CexCollectionState; storefront: string },
): CexProduct {
  const parsed = parseTitle(box.boxName);
  const vramGb = parsed.vramGb.value;
  const catalog = resolveGpuCatalog(parsed.model.value, vramGb);
  const availability = availabilityOf(box);
  return {
    boxId: box.boxId,
    title: box.boxName,
    normalisedModel: parsed.model.value,
    modelKey: catalog?.key ?? (parsed.model.value ? parsed.model.value.toLowerCase().replaceAll(' ', '-') : null),
    manufacturer: parsed.manufacturer.value ?? catalog?.manufacturer ?? null,
    family: catalog?.series ?? parsed.series.value,
    variant: parsed.variant.value,
    vramGb: vramGb ?? catalog?.vramGb ?? null,
    memoryType: parsed.memoryType.value ?? catalog?.memoryType ?? null,
    sell: poundsToMoney(box.sellPrice),
    cash: poundsToMoney(box.cashPrice),
    voucher: poundsToMoney(box.exchangePrice),
    availability,
    onlineAvailable: !box.outOfEcomStock && (box.ecomQuantityOnHand ?? 0) > 0,
    ecomQuantity: box.ecomQuantityOnHand,
    productUrl: productUrlForBox(opts.storefront, box.boxId),
    imageUrl: box.imageLarge ?? box.imageMedium,
    collectedAt: opts.collectedAt,
    dataSource: opts.dataSource,
    collectionState: opts.collectionState,
    raw: box,
  };
}

function availabilityOf(box: CexBox): CexProduct['availability'] {
  if (box.outOfStock && box.outOfEcomStock) return 'OUT_OF_STOCK';
  if (!box.outOfEcomStock && (box.ecomQuantityOnHand ?? 0) > 0) return 'IN_STOCK';
  if (!box.outOfStock && box.outOfEcomStock) return 'STORE_ONLY';
  if (box.outOfStock && !box.outOfEcomStock) return 'ONLINE_ONLY';
  return 'UNKNOWN';
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { GPU_CATALOG };

export function defaultStorefront(config: CexConfig): string {
  return config.storefrontBaseUrl;
}
