import { fromPounds, money, type Money } from '../money/money.ts';
import type { Condition, ListingType } from '../types/enums.ts';
import type { PriceBookEntry, RawListing } from '../types/listing.ts';

const DEMO = 'DEMO_SYNTHETIC' as const;

export const DEMO_NOW_ISO = '2026-09-03T13:00:00.000Z';

function isoMinutesFrom(base: string, minutes: number): string {
  return new Date(Date.parse(base) + minutes * 60_000).toISOString();
}

export function demoListing(partial: {
  itemId: string;
  title: string;
  description?: string;
  pounds: number;
  postagePounds?: number;
  listingType?: ListingType;
  condition?: Condition;
  bids?: number;
  endInMinutes?: number | null;
  listedMinutesAgo?: number;
  seller?: { username: string; score: number; pct: number };
  images?: number;
  collectionOnly?: boolean;
  returns?: boolean;
  category?: string;
  url?: string;
}): RawListing {
  const listedAt = isoMinutesFrom(DEMO_NOW_ISO, -(partial.listedMinutesAgo ?? 180));
  const endTime = partial.endInMinutes === null ? null : isoMinutesFrom(DEMO_NOW_ISO, partial.endInMinutes ?? 240);
  const seller = partial.seller ?? { username: 'ukpartspro', score: 842, pct: 99.6 };
  const listingType = partial.listingType ?? 'BUY_IT_NOW';
  const itemPrice = fromPounds(partial.pounds);
  const postage = partial.postagePounds === undefined ? money(450) : fromPounds(partial.postagePounds);
  return {
    marketplace: 'ebay',
    itemId: `v1|DEMO${partial.itemId}|0`,
    legacyItemId: partial.itemId,
    title: partial.title,
    subtitle: null,
    description: partial.description ?? 'Fully tested working graphics card. Boxed.',
    imageUrls: Array.from({ length: partial.images ?? 3 }, (_, i) => `demo://${partial.itemId}/${i}`),
    stockImageLikely: (partial.images ?? 3) <= 1,
    itemWebUrl: partial.url ?? `https://www.ebay.co.uk/itm/${partial.itemId}`,
    categoryId: '27386',
    categoryPath: partial.category ?? 'Computers > Components > Graphics Cards',
    condition: partial.condition ?? 'USED_VERY_GOOD',
    conditionText: 'Used — Very Good',
    listingType,
    buyingOptions: buyingOptions(listingType),
    itemPrice,
    postage: partial.collectionOnly ? money(0) : postage,
    collectionOnly: partial.collectionOnly ?? false,
    collectionDistanceMiles: partial.collectionOnly ? 12 : null,
    bidCount: listingType.includes('AUCTION') ? (partial.bids ?? 2) : null,
    currentBid: listingType.includes('AUCTION') ? itemPrice : null,
    endTime,
    listedAt,
    seller: {
      username: seller.username,
      feedbackScore: seller.score,
      feedbackPercentage: seller.pct,
      topRated: seller.pct >= 99,
    },
    itemLocation: 'Manchester, United Kingdom',
    returnsAccepted: partial.returns ?? true,
    country: 'GB',
    dataSource: DEMO,
    firstSeenAt: listedAt,
    lastSeenAt: DEMO_NOW_ISO,
  };
}

function buyingOptions(type: ListingType): string[] {
  if (type === 'AUCTION') return ['AUCTION'];
  if (type === 'AUCTION_WITH_BIN') return ['AUCTION', 'FIXED_PRICE'];
  if (type === 'BEST_OFFER') return ['FIXED_PRICE', 'BEST_OFFER'];
  return ['FIXED_PRICE'];
}

/** Scenario A — RX 6600 cheap auction. High score expected. */
export const SCENARIO_A = demoListing({
  itemId: '6600A',
  title: 'SAPPHIRE PULSE AMD RADEON RX6600 8GB GDDR6 GPU GRAPHICS CARD',
  pounds: 70,
  postagePounds: 5,
  listingType: 'AUCTION',
  bids: 1,
  endInMinutes: 31,
  seller: { username: 'northerntech', score: 1204, pct: 99.8 },
});

/** Scenario B — RX 6600 near market. Low score expected. */
export const SCENARIO_B = demoListing({
  itemId: '6600B',
  title: 'Sapphire Pulse RX 6600 8GB',
  pounds: 120,
  postagePounds: 10,
  listingType: 'BUY_IT_NOW',
  endInMinutes: null,
});

/** Scenario C — cheap but artefacts. High price value, high risk. */
export const SCENARIO_C = demoListing({
  itemId: '6600C',
  title: 'RX 6600 8GB untested artefacts spares or repair',
  description: 'Powers on only. Artefacts on screen. Untested beyond that. No returns. Faulty GPU.',
  pounds: 70,
  postagePounds: 5,
  listingType: 'BUY_IT_NOW',
  condition: 'FOR_PARTS',
  returns: false,
  images: 1,
  endInMinutes: null,
});

/** Scenario D — Ryzen 5 5600 ending in 5 minutes. */
export const SCENARIO_D = demoListing({
  itemId: '5600D',
  title: 'AMD Ryzen 5 5600 6 core AM4 CPU',
  description: 'Fully tested, working, boxed with stock cooler.',
  pounds: 42,
  postagePounds: 3.5,
  listingType: 'AUCTION',
  bids: 2,
  endInMinutes: 5,
  category: 'Computers > Components > CPUs',
});

export const DEMO_LISTINGS: RawListing[] = [
  SCENARIO_A,
  SCENARIO_B,
  SCENARIO_C,
  SCENARIO_D,
  demoListing({
    itemId: '3060BIN',
    title: 'MSI RTX 3060 12GB VENTUS 2X OC',
    pounds: 95,
    postagePounds: 6,
    listingType: 'BUY_IT_NOW',
    endInMinutes: null,
    listedMinutesAgo: 40,
  }),
  demoListing({
    itemId: 'B450BUN',
    title: 'Ryzen 5 3600 + MSI B450 Tomahawk + 16GB DDR4 kit bundle',
    description: 'CPU motherboard RAM combo. Fully tested working. AM4 bundle.',
    pounds: 78,
    postagePounds: 8,
    listingType: 'BEST_OFFER',
    category: 'Computers > Components > Bundles',
    endInMinutes: null,
  }),
  demoListing({
    itemId: 'PCFLIP',
    title: 'Gaming PC Ryzen 5 5600 RTX 3060 16GB 1TB NVMe Windows 11',
    description: 'Complete gaming PC. Fully tested. RTX 3060, Ryzen 5 5600, 16GB DDR4, 1TB NVMe.',
    pounds: 250,
    postagePounds: 0,
    collectionOnly: true,
    listingType: 'BUY_IT_NOW',
    category: 'Computers > Desktops',
    endInMinutes: null,
  }),
  demoListing({
    itemId: 'NVME35',
    title: 'WD SN570 1TB NVMe M.2 SSD',
    pounds: 28,
    postagePounds: 2.5,
    listingType: 'AUCTION',
    bids: 0,
    endInMinutes: 95,
    titlePoor: true,
  } as never),
  demoListing({
    itemId: 'NVMEPOOR',
    title: '1tb nvme',
    description: 'Working SSD. 1TB NVMe.',
    pounds: 24,
    postagePounds: 3,
    listingType: 'AUCTION',
    bids: 0,
    endInMinutes: 18,
    images: 1,
    seller: { username: 'quickflips12', score: 8, pct: 100 },
  }),
  demoListing({
    itemId: 'PSUSAFE',
    title: 'Corsair RM650 650W 80+ Gold PSU fully tested',
    pounds: 32,
    postagePounds: 4.5,
    listingType: 'BUY_IT_NOW',
    endInMinutes: null,
  }),
  demoListing({
    itemId: 'PSURISK',
    title: '650W power supply generic unbranded',
    description: 'Unknown PSU brand. Untested. No name power supply.',
    pounds: 12,
    postagePounds: 4,
    listingType: 'BUY_IT_NOW',
    endInMinutes: null,
  }),
  demoListing({
    itemId: 'B550',
    title: 'ASUS TUF GAMING B550-PLUS AM4 motherboard',
    pounds: 48,
    postagePounds: 5,
    listingType: 'AUCTION',
    bids: 3,
    endInMinutes: 210,
  }),
  demoListing({
    itemId: 'DDR4',
    title: 'Corsair Vengeance 16GB 2x8 DDR4 3200 kit',
    pounds: 18,
    postagePounds: 3,
    listingType: 'AUCTION_WITH_BIN',
    bids: 1,
    endInMinutes: 400,
  }),
  demoListing({
    itemId: '12400',
    title: 'Intel Core i5-12400F LGA1700',
    pounds: 68,
    postagePounds: 3.2,
    listingType: 'BEST_OFFER',
    endInMinutes: null,
  }),
  demoListing({
    itemId: '4060',
    title: 'Gigabyte RTX 4060 8GB dual fan',
    pounds: 165,
    postagePounds: 7,
    listingType: 'BUY_IT_NOW',
    endInMinutes: null,
  }),
  demoListing({
    itemId: '6700XT',
    title: 'PowerColor RX 6700 XT 12GB',
    pounds: 118,
    postagePounds: 6,
    listingType: 'AUCTION',
    bids: 6,
    endInMinutes: 55,
  }),
  demoListing({
    itemId: 'CASE',
    title: 'Micro ATX tempered glass RGB gaming case',
    pounds: 22,
    postagePounds: 8,
    listingType: 'BUY_IT_NOW',
    endInMinutes: null,
  }),
];

/**
 * Demo-only price book. Production seed has the same models with null prices.
 * These numbers are labelled DEMO_SYNTHETIC and must never mix into live analytics.
 */
export const DEMO_PRICE_BOOK: PriceBookEntry[] = [
  book('rx-6600', 'GPU', 'RX 6600', 8500, 9500, 12500, 3500),
  book('rx-6600-xt', 'GPU', 'RX 6600 XT', 10000, 11500, 14500, 3500),
  book('rx-6700-xt', 'GPU', 'RX 6700 XT', 13000, 15000, 19000, 4000),
  book('rtx-3060', 'GPU', 'RTX 3060', 11000, 12500, 15500, 3500),
  book('rtx-3060-ti', 'GPU', 'RTX 3060 Ti', 14000, 16000, 19500, 4000),
  book('rtx-4060', 'GPU', 'RTX 4060', 15000, 17000, 21000, 4000),
  book('r5-3600', 'CPU', 'Ryzen 5 3600', 2800, 3500, 4500, 1500),
  book('r5-5600', 'CPU', 'Ryzen 5 5600', 5500, 6500, 8000, 2000),
  book('r5-5600x', 'CPU', 'Ryzen 5 5600X', 6000, 7000, 9000, 2000),
  book('i5-12400f', 'CPU', 'Core i5-12400F', 7000, 8000, 10000, 2500),
  book('b450-am4', 'MOTHERBOARD', 'B450 AM4', 3000, 3800, 5000, 1500),
  book('b550-am4', 'MOTHERBOARD', 'B550 AM4', 4000, 5000, 6500, 1800),
  book('ddr4-16', 'RAM', '16GB DDR4 kit', 1800, 2200, 3000, 800),
  book('nvme-1tb', 'SSD', '1TB NVMe', 2800, 3200, 4000, 1000),
  book('psu-650', 'PSU', '650W', 3000, 3500, 4500, 1200),
];

export const EMPTY_PRODUCTION_PRICE_BOOK: PriceBookEntry[] = DEMO_PRICE_BOOK.map((row) => ({
  ...row,
  desiredBuyPrice: null,
  absoluteMaxBuyPrice: null,
  expectedResalePrice: null,
  minimumAcceptableProfit: null,
  confidence: 'INSUFFICIENT_DATA' as const,
  lastUpdated: null,
  notes: 'Structure only. Populate with your observed UK prices. Do not treat empty rows as market data.',
}));

function book(
  modelKey: string,
  componentType: PriceBookEntry['componentType'],
  displayName: string,
  desired: number,
  max: number,
  resale: number,
  minProfit: number,
): PriceBookEntry {
  return {
    modelKey,
    componentType,
    displayName,
    desiredBuyPrice: money(desired),
    absoluteMaxBuyPrice: money(max),
    expectedResalePrice: money(resale),
    minimumAcceptableProfit: money(minProfit),
    minimumAcceptableRoiBps: 2500,
    confidence: 'MEDIUM',
    lastUpdated: DEMO_NOW_ISO,
    notes: 'DEMO_SYNTHETIC fixture — not a verified sold price.',
  };
}

export function pounds(m: Money): string {
  return `£${(m.pence / 100).toFixed(2)}`;
}
