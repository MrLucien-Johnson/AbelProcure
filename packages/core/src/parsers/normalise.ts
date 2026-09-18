import {
  GPU_BOARD_PARTNERS,
  GPU_MODELS,
  CPU_MODELS,
  MOTHERBOARD_CHIPSETS,
  REPUTABLE_PSU_BRANDS,
  UNSAFE_PSU_HINTS,
  type CatalogModel,
} from '../catalog/models.ts';
import { GPU_MODELS_EXTENDED } from '../catalog/gpuExtended.ts';
import type { ComponentType } from '../types/enums.ts';
import type { FieldConfidence, NormalisedComponent } from '../types/listing.ts';

const empty = <T>(evidence = 'not found'): FieldConfidence<T> => ({
  value: null,
  confidence: 0,
  evidence,
});

const found = <T>(value: T, confidence: number, evidence: string): FieldConfidence<T> => ({
  value,
  confidence: clamp01(confidence),
  evidence,
});

export function normaliseListingText(title: string, description?: string | null): NormalisedComponent {
  const hay = `${title} ${description ?? ''}`;
  const compact = compactText(hay);
  const bundleParts: NormalisedComponent[] = [];

  const gpu = matchCatalog(compact, [...GPU_MODELS, ...GPU_MODELS_EXTENDED]);
  const cpu = matchCatalog(compact, CPU_MODELS);
  const mb = matchCatalog(compact, MOTHERBOARD_CHIPSETS);
  const ram = parseRam(compact);
  const storage = parseStorage(compact);
  const psu = parsePsu(compact);
  const pcCase = parseCase(compact);
  const cooler = parseCooler(compact);
  const wifi = parseWifi(compact);

  const isCompletePc = detectCompletePc(compact, { gpu, cpu, mb, ram, storage });
  const isBundle =
    !isCompletePc &&
    countPresent([gpu, cpu, mb, ram.capacityGb.value, storage.capacityGb.value, psu.wattage.value]) >= 2;

  if (gpu) bundleParts.push(componentFromMatch('GPU', gpu, compact));
  if (cpu) bundleParts.push(componentFromMatch('CPU', cpu, compact));
  if (mb) bundleParts.push(componentFromMatch('MOTHERBOARD', mb, compact));
  if (ram.capacityGb.value) bundleParts.push(ramAsComponent(ram));
  if (storage.capacityGb.value) bundleParts.push(storageAsComponent(storage));
  if (psu.wattage.value) bundleParts.push(psuAsComponent(psu));

  const primary =
    gpu ? componentFromMatch('GPU', gpu, compact)
    : cpu ? componentFromMatch('CPU', cpu, compact)
    : mb ? componentFromMatch('MOTHERBOARD', mb, compact)
    : ram.capacityGb.value ? ramAsComponent(ram)
    : storage.capacityGb.value ? storageAsComponent(storage)
    : psu.wattage.value ? psuAsComponent(psu)
    : pcCase.formFactor.value ? caseAsComponent(pcCase)
    : cooler.model.value ? cooler
    : wifi.model.value ? wifi
    : unknownComponent();

  const type: FieldConfidence<ComponentType> = isCompletePc
    ? found('COMPLETE_PC', 0.86, 'complete PC language plus multiple core parts')
    : isBundle
      ? found('BUNDLE', 0.8, 'multiple distinct component families in title')
      : primary.componentType;

  return {
    ...primary,
    componentType: type,
    bundleParts,
    isCompletePc,
    isBundle,
    titleQuality: titleQuality(title),
  };
}

export function parseTitle(title: string): NormalisedComponent {
  return normaliseListingText(title);
}

function componentFromMatch(type: ComponentType, model: CatalogModel, compact: string): NormalisedComponent {
  const partner = type === 'GPU' ? detectPartner(compact) : type === 'MOTHERBOARD' ? detectBoardBrand(compact) : null;
  const variantName = type === 'GPU' ? detectGpuVariant(compact) : null;
  const vram = type === 'GPU' ? parseVram(compact, model.vramGb) : empty<number>();
  const manufacturerValue =
    type === 'GPU' ? partner ?? model.manufacturer : type === 'MOTHERBOARD' ? partner ?? model.manufacturer : model.manufacturer;
  const manufacturerConfidence = partner ? 0.86 : type === 'MOTHERBOARD' ? 0.2 : 0.9;
  return {
    componentType: found(type, 0.92, `catalog match ${model.model}`),
    manufacturer: found(manufacturerValue, manufacturerConfidence, 'catalog / partner parse'),
    series: found(model.series, 0.85, 'catalog'),
    model: found(model.model, 0.93, `matched ${model.key}`),
    variant: variantName ? found(variantName, 0.78, 'variant token') : partner && type === 'GPU' ? found(partner, 0.6, 'board partner') : empty(),
    chipset: model.chipset ? found(model.chipset, 0.9, 'catalog') : empty(),
    socket: model.socket ? found(model.socket, 0.9, 'catalog') : empty(),
    generation: found(model.series, 0.6, 'series used as generation proxy'),
    vramGb: vram,
    memoryType: model.memoryType ? found(model.memoryType, 0.8, 'catalog default — not invented from empty title') : empty(),
    ramGeneration: empty(),
    capacityGb: empty(),
    wattage: empty(),
    formFactor: empty(),
    psuTier: empty(),
    bundleParts: [],
    isCompletePc: false,
    isBundle: false,
    titleQuality: 'OK',
  };
}

function parseRam(compact: string): NormalisedComponent {
  const gen = compact.includes('DDR5') ? 'DDR5' : compact.includes('DDR4') ? 'DDR4' : compact.includes('DDR3') ? 'DDR3' : null;
  const ramWord = /\bRAM\b|\bDIMM\b|\bMEMORY KIT\b|\b2[xX]\s?\d/.test(compact);
  if (!gen && !ramWord) {
    return unknownComponent();
  }
  const cap = matchNumber(compact, /(\d{1,3})\s?GB/);
  const kit = /\b2[xX]\s?8\b/.test(compact) || /\b2[xX]\s?16\b/.test(compact) || /KIT/.test(compact);
  if (!gen && !cap) {
    return unknownComponent();
  }
  return {
    ...unknownComponent(),
    componentType: found('RAM', gen || cap ? 0.78 : 0.4, 'RAM tokens'),
    model: found(gen && cap ? `${cap}GB ${gen}${kit ? ' kit' : ''}` : gen ?? `${cap}GB`, 0.7, 'regex'),
    ramGeneration: gen ? found(gen, 0.86, 'DDR token') : empty(),
    capacityGb: cap ? found(cap, 0.8, 'GB token') : empty(),
  };
}

function parseStorage(compact: string): NormalisedComponent {
  const nvme = /NVME|M\.2|M2/.test(compact);
  const sata = /SATA/.test(compact);
  const hdd = /HDD|HARD DISK|3\.5/.test(compact) && !nvme;
  const tb = matchNumber(compact, /(\d(?:\.\d)?)\s?TB/);
  const gb = matchNumber(compact, /(\d{3,4})\s?GB/);
  const capacity = tb ? Math.round(tb * 1000) : gb;
  if (!nvme && !sata && !hdd && !capacity) {
    return unknownComponent();
  }
  const type: ComponentType = hdd ? 'HDD' : 'SSD';
  return {
    ...unknownComponent(),
    componentType: found(type, nvme || sata || hdd ? 0.82 : 0.55, 'storage tokens'),
    model: found(
      [capacity ? (capacity >= 1000 ? `${capacity / 1000}TB` : `${capacity}GB`) : null, nvme ? 'NVMe' : sata ? 'SATA SSD' : hdd ? 'HDD' : null]
        .filter(Boolean)
        .join(' '),
      0.72,
      'regex',
    ),
    capacityGb: capacity ? found(capacity, 0.8, 'capacity token') : empty(),
  };
}

function parsePsu(compact: string): NormalisedComponent {
  const watts = matchNumber(compact, /(\d{3,4})\s?W(?:ATT)?S?/);
  if (!watts && !/PSU|POWER SUPPLY/.test(compact)) {
    return unknownComponent();
  }
  const reputable = REPUTABLE_PSU_BRANDS.some((brand) => compact.includes(brand.replace(' ', '')));
  const unsafe = UNSAFE_PSU_HINTS.some((hint) => compact.includes(hint.replace(' ', '')));
  const brand = REPUTABLE_PSU_BRANDS.find((b) => compact.includes(b.replace(' ', ''))) ?? null;
  const tier = reputable ? 'REPUTABLE' : unsafe || (!brand && /PSU|POWER SUPPLY/.test(compact)) ? 'GENERIC_UNKNOWN' : 'GENERIC_UNKNOWN';
  return {
    ...unknownComponent(),
    componentType: found('PSU', watts ? 0.84 : 0.6, 'PSU tokens'),
    manufacturer: brand ? found(brand, 0.8, 'brand list') : empty('brand not recognised — not invented'),
    model: found(watts ? `${watts}W` : 'PSU', 0.7, 'wattage regex'),
    wattage: watts ? found(watts, 0.86, 'wattage') : empty(),
    psuTier: found(tier, brand ? 0.8 : 0.5, 'brand reputation list'),
  };
}

function parseCase(compact: string): NormalisedComponent {
  const form = compact.includes('MICROATX') || compact.includes('MATX') || compact.includes('MICRO ATX')
    ? 'Micro ATX'
    : compact.includes('MINIITX') || compact.includes('ITX')
      ? 'Mini ITX'
      : compact.includes('ATX')
        ? 'ATX'
        : null;
  const gaming = /GAMING CASE|TEMPERED GLASS|RGB CASE|PC CASE|COMPUTER CASE/.test(compact);
  if (!form && !gaming) {
    return unknownComponent();
  }
  return {
    ...unknownComponent(),
    componentType: found('CASE', 0.7, 'case tokens'),
    formFactor: form ? found(form, 0.8, 'form factor token') : empty(),
    model: found([form, compact.includes('TEMPEREDGLASS') || compact.includes('TEMPERED GLASS') ? 'tempered glass' : null, compact.includes('RGB') ? 'RGB' : null].filter(Boolean).join(' '), 0.6, 'tokens'),
  };
}

function parseCooler(compact: string): NormalisedComponent {
  if (!/COOLER|AIO|WATERCOOL|AIR COOLER|TOWER COOLER/.test(compact)) {
    return unknownComponent();
  }
  return {
    ...unknownComponent(),
    componentType: found('COOLER', 0.7, 'cooler tokens'),
    model: found(/AIO|WATER/.test(compact) ? 'AIO' : 'air cooler', 0.65, 'tokens'),
  };
}

function parseWifi(compact: string): NormalisedComponent {
  if (!/WIFI|WI-FI|AX200|AX210|PCIE WIFI/.test(compact)) {
    return unknownComponent();
  }
  return {
    ...unknownComponent(),
    componentType: found('WIFI', 0.75, 'wifi tokens'),
    model: found(/AX210/.test(compact) ? 'AX210' : /AX200/.test(compact) ? 'AX200' : 'Wi-Fi card', 0.7, 'tokens'),
  };
}

function ramAsComponent(ram: NormalisedComponent): NormalisedComponent {
  return { ...ram, componentType: found('RAM', ram.componentType.confidence, ram.componentType.evidence) };
}
function storageAsComponent(storage: NormalisedComponent): NormalisedComponent {
  return storage;
}
function psuAsComponent(psu: NormalisedComponent): NormalisedComponent {
  return psu;
}
function caseAsComponent(pcCase: NormalisedComponent): NormalisedComponent {
  return { ...pcCase, componentType: found('CASE', 0.7, 'case') };
}

function unknownComponent(): NormalisedComponent {
  return {
    componentType: found('UNKNOWN', 0.1, 'no catalog match — not invented'),
    manufacturer: empty(),
    series: empty(),
    model: empty(),
    variant: empty(),
    chipset: empty(),
    socket: empty(),
    generation: empty(),
    vramGb: empty(),
    memoryType: empty(),
    ramGeneration: empty(),
    capacityGb: empty(),
    wattage: empty(),
    formFactor: empty(),
    psuTier: empty(),
    bundleParts: [],
    isCompletePc: false,
    isBundle: false,
    titleQuality: 'POOR',
  };
}

function matchCatalog(compact: string, models: readonly CatalogModel[]): CatalogModel | null {
  const ranked = [...models].sort((a, b) => b.model.length - a.model.length);
  for (const model of ranked) {
    const needles = [model.model, ...model.aliases, ...model.typos].map(compactText);
    if (needles.some((n) => n && compact.includes(n))) {
      return model;
    }
  }
  return null;
}

function detectPartner(compact: string): string | null {
  return GPU_BOARD_PARTNERS.find((p) => compact.includes(p)) ?? null;
}

function detectGpuVariant(compact: string): string | null {
  const variants = ['ROG STRIX', 'STRIX', 'PULSE', 'NITRO', 'VENTUS', 'GAMING X', 'TUF', 'EAGLE', 'DUAL', 'MECH', 'TRINITY'];
  return variants.find((v) => compact.includes(v)) ?? null;
}

function detectBoardBrand(compact: string): string | null {
  const brands = ['MSI', 'ASUS', 'GIGABYTE', 'ASROCK', 'BIOSTAR'];
  return brands.find((b) => compact.includes(b)) ?? null;
}

function parseVram(compact: string, catalogDefault?: number): FieldConfidence<number> {
  const gb = matchNumber(compact, /(\d{1,2})\s?GB/);
  if (gb && gb >= 4 && gb <= 24) {
    return found(gb, 0.85, 'VRAM GB in text');
  }
  if (catalogDefault) {
    return found(catalogDefault, 0.45, 'catalog default — title omitted VRAM');
  }
  return empty('VRAM not stated');
}

function detectCompletePc(
  compact: string,
  parts: { gpu: CatalogModel | null; cpu: CatalogModel | null; mb: CatalogModel | null; ram: NormalisedComponent; storage: NormalisedComponent },
): boolean {
  const language = /GAMING PC|DESKTOP PC|TOWER PC|COMPLETE PC|FULL PC|WINDOWS 1[01]|BUNDLE PC/.test(compact);
  const partCount = countPresent([parts.gpu, parts.cpu, parts.mb, parts.ram.capacityGb.value, parts.storage.capacityGb.value]);
  return language && partCount >= 2;
}

function countPresent(values: readonly unknown[]): number {
  return values.filter(Boolean).length;
}

function titleQuality(title: string): 'POOR' | 'OK' | 'GOOD' {
  const length = title.trim().length;
  const hasSpaces = title.includes(' ');
  const capsRatio = title.replace(/[^A-Z]/g, '').length / Math.max(title.replace(/[^A-Za-z]/g, '').length, 1);
  if (length < 18 || !hasSpaces) return 'POOR';
  if (length > 40 && capsRatio < 0.9) return 'GOOD';
  return 'OK';
}

export function compactText(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/RX(\d)/g, 'RX $1')
    .replace(/RTX(\d)/g, 'RTX $1')
    .replace(/I(\d)(\d{4})/g, 'I$1-$2')
    .trim();
}

function matchNumber(compact: string, regex: RegExp): number | null {
  const match = compact.match(regex);
  if (!match?.[1]) return null;
  return Number(match[1]);
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}
