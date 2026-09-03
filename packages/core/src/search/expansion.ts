import { CPU_MODELS, GPU_MODELS, MOTHERBOARD_CHIPSETS, type CatalogModel } from '../catalog/models.ts';
import type { ComponentType } from '../types/enums.ts';

export interface ExpandedQuery {
  readonly label: string;
  readonly q: string;
  readonly categoryHint: ComponentType | null;
  readonly excludeTerms: readonly string[];
  readonly includeSparesRepair: boolean;
}

const GENERIC_GPU = ['gaming GPU', 'AMD graphics', 'Radeon graphics card', 'graphics card'];
const GENERIC_CPU = ['AMD CPU', 'Ryzen processor', 'gaming CPU'];

export function expandSearch(model: CatalogModel): ExpandedQuery[] {
  const queries: ExpandedQuery[] = [
    { label: 'canonical', q: model.model, categoryHint: model.type, excludeTerms: [], includeSparesRepair: false },
  ];
  for (const alias of model.aliases) {
    queries.push({ label: `alias:${alias}`, q: alias, categoryHint: model.type, excludeTerms: [], includeSparesRepair: false });
  }
  for (const typo of model.typos) {
    queries.push({ label: `typo:${typo}`, q: typo, categoryHint: model.type, excludeTerms: [], includeSparesRepair: false });
  }
  if (model.type === 'GPU') {
    queries.push({ label: 'no-spaces', q: model.model.replaceAll(' ', ''), categoryHint: 'GPU', excludeTerms: [], includeSparesRepair: false });
    queries.push({
      label: 'spares',
      q: `${model.model} spares repair`,
      categoryHint: 'GPU',
      excludeTerms: [],
      includeSparesRepair: true,
    });
    for (const extra of GENERIC_GPU) {
      queries.push({ label: `generic:${extra}`, q: extra, categoryHint: 'GPU', excludeTerms: ['laptop', 'mac'], includeSparesRepair: false });
    }
  }
  if (model.type === 'CPU') {
    for (const extra of GENERIC_CPU) {
      queries.push({ label: `generic:${extra}`, q: extra, categoryHint: 'CPU', excludeTerms: ['laptop'], includeSparesRepair: false });
    }
  }
  return dedupe(queries);
}

export function expandKeyword(keyword: string, type?: ComponentType): ExpandedQuery[] {
  const fromCatalog =
    [...GPU_MODELS, ...CPU_MODELS, ...MOTHERBOARD_CHIPSETS].find(
      (m) => m.model.toLowerCase() === keyword.toLowerCase() || m.aliases.some((a) => a.toLowerCase() === keyword.toLowerCase()),
    ) ?? null;
  if (fromCatalog) return expandSearch(fromCatalog);
  const compact = keyword.replaceAll(' ', '');
  const queries: ExpandedQuery[] = [
    { label: 'canonical', q: keyword, categoryHint: type ?? null, excludeTerms: [], includeSparesRepair: false },
  ];
  if (compact !== keyword) {
    queries.push({ label: 'no-spaces', q: compact, categoryHint: type ?? null, excludeTerms: [], includeSparesRepair: false });
  }
  return queries;
}

export const QUICK_FILTERS = {
  gpu: GPU_MODELS.map((m) => ({ id: m.key, label: m.model, type: m.type, q: m.model })),
  cpu: CPU_MODELS.map((m) => ({ id: m.key, label: m.model, type: m.type, q: m.model })),
  motherboard: MOTHERBOARD_CHIPSETS.map((m) => ({ id: m.key, label: m.displayName, type: m.type, q: `${m.chipset} ${m.socket}` })),
  ram: [
    { id: 'ddr4-8', label: 'DDR4 8GB', type: 'RAM' as const, q: 'DDR4 8GB' },
    { id: 'ddr4-16', label: 'DDR4 16GB', type: 'RAM' as const, q: 'DDR4 16GB kit' },
    { id: 'ddr4-32', label: 'DDR4 32GB', type: 'RAM' as const, q: 'DDR4 32GB kit' },
    { id: 'ddr5-16', label: 'DDR5 16GB', type: 'RAM' as const, q: 'DDR5 16GB kit' },
    { id: 'ddr5-32', label: 'DDR5 32GB', type: 'RAM' as const, q: 'DDR5 32GB kit' },
  ],
  storage: [
    { id: 'nvme-500', label: '500GB NVMe', type: 'SSD' as const, q: '500GB NVMe' },
    { id: 'nvme-1tb', label: '1TB NVMe', type: 'SSD' as const, q: '1TB NVMe' },
    { id: 'nvme-2tb', label: '2TB NVMe', type: 'SSD' as const, q: '2TB NVMe' },
    { id: 'sata-ssd', label: 'SATA SSD', type: 'SSD' as const, q: 'SATA SSD 1TB' },
  ],
  psu: [450, 500, 550, 600, 650, 750, 850].map((w) => ({
    id: `psu-${w}`,
    label: `${w}W`,
    type: 'PSU' as const,
    q: `${w}W PSU`,
  })),
  cases: [
    { id: 'matx', label: 'Micro ATX', type: 'CASE' as const, q: 'micro ATX case' },
    { id: 'atx', label: 'ATX', type: 'CASE' as const, q: 'ATX gaming case' },
    { id: 'tg', label: 'Tempered glass', type: 'CASE' as const, q: 'tempered glass gaming case' },
    { id: 'rgb', label: 'RGB', type: 'CASE' as const, q: 'RGB gaming case' },
  ],
} as const;

export const SEARCH_PRESETS = [
  { id: 'budget-gpu', name: 'BUDGET GPU HUNT', query: 'RX 6600', filters: { componentType: 'GPU', maxLandedPence: 10000, auctionOnly: false } },
  { id: 'am4-value', name: 'AM4 VALUE BUILD', query: 'AM4', filters: { maxLandedPence: 8000 } },
  { id: '1tb-storage', name: '1TB STORAGE HUNT', query: '1TB NVMe', filters: { componentType: 'SSD', maxLandedPence: 3500 } },
  { id: 'psu-bargains', name: 'PSU BARGAINS', query: '650W PSU', filters: { componentType: 'PSU', maxLandedPence: 3500 } },
  { id: 'ending-soon', name: 'ENDING SOON', query: 'graphics card', filters: { endingSoon: true, auctionOnly: true } },
  { id: 'low-comp', name: 'LOW COMPETITION AUCTIONS', query: 'Ryzen 5', filters: { auctionOnly: true, endingSoon: true } },
  { id: 'bin-mispriced', name: 'BUY IT NOW MISPRICED', query: 'RTX 3060', filters: { buyItNowOnly: true } },
  { id: 'offers', name: 'OFFERS AVAILABLE', query: 'gaming PC', filters: { bestOffer: true } },
  { id: 'bundles', name: 'BUNDLES', query: 'CPU motherboard RAM', filters: {} },
  { id: 'complete-pc', name: 'COMPLETE PC FLIPS', query: 'gaming PC', filters: { componentType: 'COMPLETE_PC' } },
] as const;

function dedupe(queries: ExpandedQuery[]): ExpandedQuery[] {
  const seen = new Set<string>();
  return queries.filter((q) => {
    const key = q.q.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
