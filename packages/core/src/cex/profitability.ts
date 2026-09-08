import { add, formatGBP, money, type Money } from '../money/money.ts';
import { calculateLandedCost, calculateProfit } from '../market/economics.ts';
import { performanceFor, type GpuPerformanceProfile } from './performance.ts';
import type { CexProduct, CpuBalance, PsuClass } from './types.ts';

export const BUILD4_ID = 'build-4';
export const BUILD4_COST_BEFORE_GPU = money(26893);
export const GTX1080_BENCHMARK_LANDED = money(10015);

export const BUILD4 = {
  id: BUILD4_ID,
  name: 'Build 4',
  costBeforeGpu: BUILD4_COST_BEFORE_GPU,
  cpu: 'AMD Ryzen 5 PRO 2400G',
  cpuKey: 'r5-2400g',
  motherboard: 'ASUS Prime B450M-A',
  ram: 'Corsair Vengeance LPX 16GB 2x8GB DDR4-3200',
  storage: 'XPG SX8200NP 1TB NVMe',
  psu: 'Corsair VS550 550W (older VS)',
  psuWatts: 550,
  psuAge: 'older VS generation',
  case: 'Sharkoon Rebel C50 RGB White',
  cooler: 'AMD Wraith Stealth',
  gpu: null,
  spareGpu: {
    model: 'Gigabyte GeForce GT 1030 OC 2GB GDDR5',
    modelKey: 'gt-1030',
    landed: money(3483),
    allocateToBuild4: false,
  },
} as const;

export const CPU_UPGRADES = [
  { key: 'r5-2400g', name: 'Ryzen 5 PRO 2400G (current)', extraCost: money(0), balanceRelief: 0 },
  { key: 'r5-3600', name: 'Ryzen 5 3600', extraCost: money(3500), balanceRelief: 22 },
  { key: 'r5-3600x', name: 'Ryzen 5 3600X', extraCost: money(4200), balanceRelief: 24 },
  { key: 'r5-5600', name: 'Ryzen 5 5600', extraCost: money(6500), balanceRelief: 38 },
] as const;

export interface CompletePcEstimate {
  readonly gpuKey: string;
  readonly cpuKey: string;
  readonly expectedSale: Money;
  readonly kind: 'DEMO_SYNTHETIC' | 'USER_PRICE_BOOK' | 'INSUFFICIENT_DATA';
  readonly notes: string;
}

/** Demo-only finished-PC estimates. Production must use the owner's book. */
export const DEMO_COMPLETE_PC_ESTIMATES: readonly CompletePcEstimate[] = [
  est('gtx-1080', 'r5-2400g', 43000, '2400G + GTX 1080 16/1TB band'),
  est('gtx-1080', 'r5-3600', 49000, '3600 + GTX 1080'),
  est('gtx-1080', 'r5-5600', 53000, '5600 + GTX 1080'),
  est('gtx-1660-super', 'r5-2400g', 40000, '2400G + 1660 Super'),
  est('rx-6600', 'r5-2400g', 52000, '2400G + RX 6600'),
  est('rx-6600', 'r5-3600', 58000, '3600 + RX 6600'),
  est('rx-6600', 'r5-5600', 64000, '5600 + RX 6600'),
  est('rtx-3060', 'r5-2400g', 54000, '2400G + 3060 12GB'),
  est('rtx-3060', 'r5-3600', 60000, '3600 + 3060 12GB'),
  est('rtx-3060', 'r5-5600', 65000, '5600 + 3060 12GB'),
  est('rtx-3060-8gb', 'r5-2400g', 50000, '2400G + 3060 8GB'),
  est('rtx-3060-ti', 'r5-2400g', 56000, '2400G + 3060 Ti'),
  est('rtx-3060-ti', 'r5-5600', 68000, '5600 + 3060 Ti'),
  est('gtx-1070', 'r5-2400g', 36000, '2400G + 1070'),
  est('rx-5700-xt', 'r5-2400g', 45000, '2400G + 5700 XT'),
  est('rtx-2060-super', 'r5-2400g', 44000, '2400G + 2060 Super'),
  est('rx-580', 'r5-2400g', 32000, '2400G + RX 580 — weak finished-PC band'),
  est('rx-6600-xt', 'r5-2400g', 54000, '2400G + 6600 XT'),
  est('gtx-1660-super', 'r5-3600', 45000, '3600 + 1660 Super'),
  est('gtx-1660-super', 'r5-5600', 49000, '5600 + 1660 Super'),
];

function est(gpuKey: string, cpuKey: string, pence: number, notes: string): CompletePcEstimate {
  return { gpuKey, cpuKey, expectedSale: money(pence), kind: 'DEMO_SYNTHETIC', notes };
}

export function classifyPsu(profile: GpuPerformanceProfile | null, psuWatts = BUILD4.psuWatts): PsuClass {
  if (!profile) return 'BORDERLINE';
  const load = profile.typicalBoardPowerW + 65 + 40;
  // Older VS550: do not auto-reject on nameplate wattage alone.
  if (profile.recommendedPsuW >= 750 && psuWatts <= 550) return 'INCOMPATIBLE';
  if (profile.recommendedPsuW >= 650 && psuWatts <= 550) return 'PSU_UPGRADE_RECOMMENDED';
  if (profile.pciePower === '8+8' && psuWatts <= 550) return 'PSU_UPGRADE_RECOMMENDED';
  if (load > psuWatts * 0.85) return 'BORDERLINE';
  if (load > psuWatts * 0.7) return 'ACCEPTABLE';
  if (profile.typicalBoardPowerW >= 200 && psuWatts <= 550) return 'BORDERLINE';
  return 'SAFE';
}

export function psuScoreOf(cls: PsuClass): number {
  switch (cls) {
    case 'SAFE':
      return 1;
    case 'ACCEPTABLE':
      return 0.78;
    case 'BORDERLINE':
      return 0.5;
    case 'PSU_UPGRADE_RECOMMENDED':
      return 0.32;
    case 'INCOMPATIBLE':
      return 0;
  }
}

export function psuReason(profile: GpuPerformanceProfile | null, cls: PsuClass): string {
  if (!profile) return 'Unknown GPU power draw — treat VS550 headroom as uncertain.';
  const load = profile.typicalBoardPowerW + 65 + 40;
  return `${cls}: GPU ~${profile.typicalBoardPowerW}W board + CPU/system ≈ ${load}W on older Corsair VS550 550W (${profile.pciePower} PCIe).`;
}

export function cpuBalanceNoteOf(profile: GpuPerformanceProfile | null, cls: CpuBalance): string {
  const gpu = profile?.displayName ?? 'this GPU';
  switch (cls) {
    case 'WELL_MATCHED':
      return `${gpu} is a reasonable pairing with the Ryzen 5 PRO 2400G at 1080p.`;
    case 'MODERATE_BOTTLENECK':
      return `${gpu} will leave some 1080p performance on the table with the 2400G — still usable for resale.`;
    case 'HIGH_BOTTLENECK':
      return `${gpu} is well ahead of the 2400G at 1080p. Do not reject automatically; model a cheap AM4 CPU upgrade.`;
    case 'CPU_UPGRADE_SUGGESTED':
      return `${gpu} + 2400G is unbalanced; a 3600/5600 may raise finished-PC profit.`;
  }
}

export function valuationConfidence(kind: CompletePcEstimate['kind'] | null, sampleSize: number): number {
  if (kind === 'USER_PRICE_BOOK' && sampleSize >= 5) return 0.85;
  if (kind === 'USER_PRICE_BOOK') return 0.7;
  if (kind === 'DEMO_SYNTHETIC') return 0.42;
  return 0.18;
}

export function classifyCpuBalance(profile: GpuPerformanceProfile | null, cpuKey: string = BUILD4.cpuKey): CpuBalance {
  if (!profile) return 'MODERATE_BOTTLENECK';
  if (cpuKey === 'r5-5600') return profile.relative1080p >= 130 ? 'MODERATE_BOTTLENECK' : 'WELL_MATCHED';
  if (cpuKey === 'r5-3600' || cpuKey === 'r5-3600x') {
    return profile.relative1080p >= 115 ? 'MODERATE_BOTTLENECK' : 'WELL_MATCHED';
  }
  if (profile.relative1080p >= 100) return 'HIGH_BOTTLENECK';
  if (profile.relative1080p >= 80) return 'MODERATE_BOTTLENECK';
  return 'WELL_MATCHED';
}

export interface CpuUpgradeSuggestion {
  readonly cpuKey: string;
  readonly cpuName: string;
  readonly upgradeCost: Money;
  readonly netWithUpgrade: Money;
  readonly deltaNet: Money;
}

export interface BuildProfitResult {
  readonly gpuLanded: Money;
  readonly buildCost: Money;
  readonly expectedSale: Money | null;
  readonly saleKind: CompletePcEstimate['kind'] | null;
  readonly gross: Money | null;
  readonly net: Money | null;
  readonly roiBps: number | null;
  readonly profitPerPoundBps: number | null;
  readonly psu: PsuClass;
  readonly psuScore: number;
  readonly psuReason: string;
  readonly cpuBalance: CpuBalance;
  readonly cpuBalanceNote: string;
  readonly performancePerPound: number | null;
  readonly cpuUpgradeNote: string | null;
  readonly cpuUpgrade: CpuUpgradeSuggestion | null;
  readonly confidence: number;
}

export function build4Profit(
  product: CexProduct,
  estimates: readonly CompletePcEstimate[] = DEMO_COMPLETE_PC_ESTIMATES,
): BuildProfitResult {
  const gpuLanded = product.sell ?? money(0);
  const landed = calculateLandedCost({ itemPrice: gpuLanded });
  const profile = performanceFor(product.modelKey);
  const psu = classifyPsu(profile);
  const cpuBalance = classifyCpuBalance(profile);
  const match = estimates.find((e) => e.gpuKey === product.modelKey && e.cpuKey === BUILD4.cpuKey) ?? null;
  const buildCost = add(BUILD4_COST_BEFORE_GPU, landed.landedCost);
  const profit = calculateProfit({
    expectedSalePrice: match?.expectedSale ?? null,
    landedCost: buildCost,
  });
  const upgrade = suggestCpuUpgrade(product, estimates, buildCost, match);
  const balance = upgrade ? ('CPU_UPGRADE_SUGGESTED' as const) : cpuBalance;
  const saleKind = match?.kind ?? (product.modelKey ? 'INSUFFICIENT_DATA' : null);
  const perfPerPound =
    profile && gpuLanded.pence > 0 ? Math.round((profile.relative1080p * 100) / (gpuLanded.pence / 100)) : null;
  return {
    gpuLanded: landed.landedCost,
    buildCost,
    expectedSale: match?.expectedSale ?? null,
    saleKind,
    gross: profit.grossMargin,
    net: profit.netMargin,
    roiBps: profit.roiBps,
    profitPerPoundBps: profit.netMargin && buildCost.pence ? Math.round((profit.netMargin.pence * 10_000) / buildCost.pence) : null,
    psu,
    psuScore: psuScoreOf(psu),
    psuReason: psuReason(profile, psu),
    cpuBalance: balance,
    cpuBalanceNote: cpuBalanceNoteOf(profile, balance),
    performancePerPound: perfPerPound,
    cpuUpgradeNote: upgrade ? `${upgrade.cpuName} (+${formatGBP(upgrade.upgradeCost)}) lifts expected net to ${formatGBP(upgrade.netWithUpgrade)} vs keeping the 2400G.` : null,
    cpuUpgrade: upgrade,
    confidence: valuationConfidence(saleKind, 0),
  };
}

export function gtx1080BenchmarkProfit(estimates: readonly CompletePcEstimate[] = DEMO_COMPLETE_PC_ESTIMATES): BuildProfitResult {
  const fake: CexProduct = {
    boxId: 'BENCH-1080',
    title: 'ASUS ROG Strix GTX 1080 8GB (pending offer)',
    normalisedModel: 'GTX 1080',
    modelKey: 'gtx-1080',
    manufacturer: 'ASUS',
    family: 'GeForce GTX',
    variant: 'ROG Strix',
    vramGb: 8,
    memoryType: 'GDDR5X',
    sell: GTX1080_BENCHMARK_LANDED,
    cash: null,
    voucher: null,
    availability: 'UNKNOWN',
    onlineAvailable: false,
    ecomQuantity: null,
    productUrl: null,
    imageUrl: null,
    collectedAt: new Date().toISOString(),
    dataSource: 'USER_ENTERED',
    collectionState: 'CACHED',
    raw: {
      boxId: 'BENCH-1080',
      boxName: 'ASUS ROG Strix GTX 1080 8GB',
      categoryId: null,
      categoryName: null,
      superCatName: null,
      sellPrice: 100.15,
      cashPrice: null,
      exchangePrice: null,
      outOfStock: false,
      outOfEcomStock: false,
      ecomQuantityOnHand: null,
      imageLarge: null,
      imageMedium: null,
      cannotBuy: false,
    },
  };
  return build4Profit(fake, estimates);
}

function suggestCpuUpgrade(
  product: CexProduct,
  estimates: readonly CompletePcEstimate[],
  currentBuildCost: Money,
  currentMatch: CompletePcEstimate | null,
): CpuUpgradeSuggestion | null {
  if (!product.modelKey || !currentMatch) return null;
  const profile = performanceFor(product.modelKey);
  if (!profile || profile.relative1080p < 85) return null;
  let best: CpuUpgradeSuggestion | null = null;
  let bestNet = currentNet(currentMatch.expectedSale, currentBuildCost);
  for (const cpu of CPU_UPGRADES) {
    if (cpu.key === BUILD4.cpuKey) continue;
    const est = estimates.find((e) => e.gpuKey === product.modelKey && e.cpuKey === cpu.key);
    if (!est) continue;
    const cost = add(currentBuildCost, cpu.extraCost);
    const netPence = currentNet(est.expectedSale, cost);
    if (netPence > bestNet + 1500) {
      bestNet = netPence;
      best = {
        cpuKey: cpu.key,
        cpuName: cpu.name,
        upgradeCost: cpu.extraCost,
        netWithUpgrade: money(netPence),
        deltaNet: money(netPence - currentNet(currentMatch.expectedSale, currentBuildCost)),
      };
    }
  }
  return best;
}

function currentNet(sale: Money, buildCost: Money): number {
  return calculateProfit({ expectedSalePrice: sale, landedCost: buildCost }).netMargin?.pence ?? Number.NEGATIVE_INFINITY;
}
