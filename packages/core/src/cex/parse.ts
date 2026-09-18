import type { CexBox } from './types.ts';

interface LooseBox {
  boxId?: unknown;
  boxName?: unknown;
  categoryId?: unknown;
  categoryName?: unknown;
  superCatName?: unknown;
  sellPrice?: unknown;
  cashPrice?: unknown;
  exchangePrice?: unknown;
  outOfStock?: unknown;
  outOfEcomStock?: unknown;
  ecomQuantityOnHand?: unknown;
  cannotBuy?: unknown;
  imageUrls?: { large?: unknown; medium?: unknown };
}

export function parseCexBoxesPayload(payload: unknown): { boxes: CexBox[]; totalRecords: number | null; ack: string; firstRecord: number | null; count: number | null } {
  if (!payload || typeof payload !== 'object') {
    throw new Error('CeX payload is not an object');
  }
  const root = payload as {
    response?: {
      ack?: string;
      data?: { boxes?: unknown; totalRecords?: unknown; totalBoxes?: unknown; firstRecord?: unknown; count?: unknown };
    };
  };
  const ack = root.response?.ack ?? 'Unknown';
  if (ack === 'Failure') {
    throw new Error('CeX API ack Failure');
  }
  const data = root.response?.data;
  const rawBoxes = Array.isArray(data?.boxes) ? data.boxes : [];
  const boxes = rawBoxes.map((row) => parseBox(row)).filter((b): b is CexBox => b !== null);
  const total =
    typeof data?.totalRecords === 'number'
      ? data.totalRecords
      : typeof data?.totalBoxes === 'number'
        ? data.totalBoxes
        : null;
  return {
    boxes,
    totalRecords: total,
    ack,
    firstRecord: typeof data?.firstRecord === 'number' ? data.firstRecord : null,
    count: typeof data?.count === 'number' ? data.count : boxes.length,
  };
}

export function coerceCexImportPayload(raw: unknown): unknown {
  if (Array.isArray(raw)) {
    return { response: { ack: 'Success', data: { boxes: raw, totalBoxes: raw.length } } };
  }
  if (raw && typeof raw === 'object') {
    const obj = raw as { response?: unknown; boxes?: unknown; data?: { boxes?: unknown } };
    if (obj.response) return raw;
    if (Array.isArray(obj.boxes)) {
      return { response: { ack: 'Success', data: obj } };
    }
    if (obj.data && typeof obj.data === 'object' && Array.isArray(obj.data.boxes)) {
      return { response: { ack: 'Success', data: obj.data } };
    }
  }
  return raw;
}

export function parseCexBoxesResponse(text: string): ReturnType<typeof parseCexBoxesPayload> {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('CeX boxes response is not JSON');
  }
  return parseCexBoxesPayload(json);
}

export interface CexProductLine {
  readonly productLineId: number;
  readonly productLineName: string;
}

export interface CexCategoryRow {
  readonly categoryId: number;
  readonly categoryName: string;
  readonly productLineId: number | null;
  readonly totalBoxes: number | null;
}

export function parseCexProductLines(text: string): CexProductLine[] {
  const json = JSON.parse(text) as { response?: { ack?: string; data?: { productLines?: unknown } } };
  if (json.response?.ack === 'Failure') throw new Error('CeX productlines ack Failure');
  const rows = Array.isArray(json.response?.data?.productLines) ? json.response.data.productLines : [];
  return rows.flatMap((row) => {
    if (!row || typeof row !== 'object') return [];
    const r = row as { productLineId?: unknown; productLineName?: unknown };
    if (typeof r.productLineId !== 'number' || typeof r.productLineName !== 'string') return [];
    return [{ productLineId: r.productLineId, productLineName: r.productLineName }];
  });
}

export function parseCexCategories(text: string): CexCategoryRow[] {
  const json = JSON.parse(text) as { response?: { ack?: string; data?: { categories?: unknown } } };
  if (json.response?.ack === 'Failure') throw new Error('CeX categories ack Failure');
  const rows = Array.isArray(json.response?.data?.categories) ? json.response.data.categories : [];
  return rows.flatMap((row) => {
    if (!row || typeof row !== 'object') return [];
    const r = row as {
      categoryId?: unknown;
      categoryName?: unknown;
      productLineId?: unknown;
      totalBoxes?: unknown;
    };
    if (typeof r.categoryId !== 'number' || typeof r.categoryName !== 'string') return [];
    return [
      {
        categoryId: r.categoryId,
        categoryName: r.categoryName,
        productLineId: typeof r.productLineId === 'number' ? r.productLineId : null,
        totalBoxes: typeof r.totalBoxes === 'number' ? r.totalBoxes : null,
      },
    ];
  });
}

export function parseBox(row: unknown): CexBox | null {
  if (!row || typeof row !== 'object') return null;
  const b = row as LooseBox;
  if (typeof b.boxId !== 'string' || typeof b.boxName !== 'string') return null;
  return {
    boxId: b.boxId,
    boxName: b.boxName,
    categoryId: typeof b.categoryId === 'number' ? b.categoryId : null,
    categoryName: typeof b.categoryName === 'string' ? b.categoryName : null,
    superCatName: typeof b.superCatName === 'string' ? b.superCatName : null,
    sellPrice: num(b.sellPrice),
    cashPrice: num(b.cashPrice),
    exchangePrice: num(b.exchangePrice),
    outOfStock: truthy(b.outOfStock),
    outOfEcomStock: truthy(b.outOfEcomStock),
    ecomQuantityOnHand: num(b.ecomQuantityOnHand),
    imageLarge: typeof b.imageUrls?.large === 'string' ? b.imageUrls.large : typeof (b as { imageLarge?: unknown }).imageLarge === 'string' ? (b as { imageLarge: string }).imageLarge : null,
    imageMedium: typeof b.imageUrls?.medium === 'string' ? b.imageUrls.medium : typeof (b as { imageMedium?: unknown }).imageMedium === 'string' ? (b as { imageMedium: string }).imageMedium : null,
    cannotBuy: truthy(b.cannotBuy),
  };
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function parseAlgoliaHit(row: unknown): CexBox | null {
  if (!row || typeof row !== 'object') return null;
  const h = row as Record<string, unknown>;
  const boxId = typeof h.boxId === 'string' ? h.boxId : typeof h.objectID === 'string' ? h.objectID : null;
  const boxName = typeof h.boxName === 'string' ? h.boxName : null;
  if (!boxId || !boxName) return null;
  const categoryId =
    typeof h.categoryId === 'number'
      ? h.categoryId
      : typeof h.categoryId === 'string' && /^\d+$/.test(h.categoryId)
        ? Number(h.categoryId)
        : null;
  const images = h.imageUrls && typeof h.imageUrls === 'object' ? (h.imageUrls as { large?: unknown; medium?: unknown }) : null;
  const inStockOnline = h.inStockOnline === 1 || h.inStockOnline === true;
  const inStockStore = h.inStockStore === 1 || h.inStockStore === true;
  const ecom =
    num(h.ecomQuantity) ??
    num(h.collectionQuantity) ??
    (inStockOnline ? 1 : 0);
  return {
    boxId,
    boxName,
    categoryId,
    categoryName: typeof h.categoryName === 'string' ? h.categoryName : null,
    superCatName: typeof h.superCatName === 'string' ? h.superCatName : null,
    sellPrice: num(h.sellPrice),
    cashPrice: num(h.cashPriceCalculated) ?? num(h.cashBuyPrice) ?? num(h.cashPrice),
    exchangePrice: num(h.exchangePriceCalculated) ?? num(h.exchangePrice),
    outOfStock: !inStockStore,
    outOfEcomStock: !inStockOnline,
    ecomQuantityOnHand: ecom,
    imageLarge: typeof images?.large === 'string' ? images.large : typeof h.productImage === 'string' ? h.productImage : null,
    imageMedium: typeof images?.medium === 'string' ? images.medium : null,
    cannotBuy: h.webSaleAllowed === 0 || h.boxWebSaleAllowed === 0 || h.boxSaleAllowed === 0,
  };
}

function truthy(value: unknown): boolean {
  return value === 1 || value === true;
}
