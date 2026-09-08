import type { ComponentType } from '../types/enums.ts';

export interface CatalogModel {
  readonly key: string;
  readonly type: ComponentType;
  readonly displayName: string;
  readonly manufacturer: string;
  readonly series: string;
  readonly model: string;
  readonly aliases: readonly string[];
  readonly typos: readonly string[];
  readonly demand: number;
  readonly liquidity: number;
  readonly gamingTags: readonly string[];
  readonly socket?: string;
  readonly chipset?: string;
  readonly vramGb?: number;
  readonly memoryType?: string;
  readonly ramGeneration?: string;
  readonly typicalBuildBand?: string;
}

export const GPU_MODELS: readonly CatalogModel[] = [
  gpu('rx-6600', 'AMD', 'Radeon RX', 'RX 6600', ['RX6600', '6600 8GB', 'Radeon 6600', 'RX 6600 8G'], ['RX 660', 'RX660O'], 92, 88, ['1080p', 'Fortnite', 'GTA V', 'esports'], 8, 'GDDR6', '£450–£550'),
  gpu('rx-6600-xt', 'AMD', 'Radeon RX', 'RX 6600 XT', ['RX6600XT', '6600 XT', '6600XT'], ['6600XTX'], 86, 80, ['1080p', '1440p'], 8, 'GDDR6', '£500–£650'),
  gpu('rx-6650-xt', 'AMD', 'Radeon RX', 'RX 6650 XT', ['RX6650XT', '6650 XT'], [], 84, 78, ['1080p', '1440p'], 8, 'GDDR6', '£500–£650'),
  gpu('rx-6700-xt', 'AMD', 'Radeon RX', 'RX 6700 XT', ['RX6700XT', '6700 XT', '6700XT'], [], 90, 85, ['1440p', 'GTA V'], 12, 'GDDR6', '£550–£750'),
  gpu('rx-6750-xt', 'AMD', 'Radeon RX', 'RX 6750 XT', ['RX6750XT', '6750 XT'], [], 82, 74, ['1440p'], 12, 'GDDR6', '£600–£800'),
  gpu('rx-7600', 'AMD', 'Radeon RX', 'RX 7600', ['RX7600', '7600 8GB'], [], 80, 76, ['1080p', 'Fortnite'], 8, 'GDDR6', '£500–£650'),
  gpu('rx-7700-xt', 'AMD', 'Radeon RX', 'RX 7700 XT', ['RX7700XT', '7700 XT'], [], 78, 70, ['1440p'], 12, 'GDDR6', '£650–£850'),
  gpu('rtx-2060', 'NVIDIA', 'GeForce RTX', 'RTX 2060', ['RTX2060', '2060 6GB'], [], 70, 72, ['1080p', 'esports'], 6, 'GDDR6', '£350–£450'),
  gpu('rtx-2060-super', 'NVIDIA', 'GeForce RTX', 'RTX 2060 Super', ['RTX2060S', '2060 SUPER'], [], 68, 65, ['1080p'], 8, 'GDDR6', '£380–£480'),
  gpu('rtx-2070', 'NVIDIA', 'GeForce RTX', 'RTX 2070', ['RTX2070'], [], 66, 62, ['1080p', '1440p'], 8, 'GDDR6', '£400–£520'),
  gpu('rtx-2070-super', 'NVIDIA', 'GeForce RTX', 'RTX 2070 Super', ['RTX2070S', '2070 SUPER'], [], 72, 68, ['1440p'], 8, 'GDDR6', '£430–£550'),
  gpu('rtx-2080', 'NVIDIA', 'GeForce RTX', 'RTX 2080', ['RTX2080'], [], 64, 58, ['1440p'], 8, 'GDDR6', '£450–£600'),
  gpu('rtx-3060', 'NVIDIA', 'GeForce RTX', 'RTX 3060', ['RTX3060', '3060 12GB'], [], 88, 86, ['1080p', 'Fortnite', 'Roblox'], 12, 'GDDR6', '£450–£600'),
  gpu('rtx-3060-ti', 'NVIDIA', 'GeForce RTX', 'RTX 3060 Ti', ['RTX3060TI', '3060TI', '3060 Ti'], [], 90, 84, ['1080p', '1440p'], 8, 'GDDR6', '£500–£700'),
  gpu('rtx-3070', 'NVIDIA', 'GeForce RTX', 'RTX 3070', ['RTX3070'], [], 87, 80, ['1440p', 'Steam'], 8, 'GDDR6', '£550–£750'),
  gpu('rtx-4060', 'NVIDIA', 'GeForce RTX', 'RTX 4060', ['RTX4060'], [], 85, 82, ['1080p', 'Fortnite', 'esports'], 8, 'GDDR6', '£500–£700'),
];

export const CPU_MODELS: readonly CatalogModel[] = [
  cpu('r5-2400g', 'AMD', 'Ryzen 5', 'Ryzen 5 PRO 2400G', ['R5 2400G', '2400G', 'Ryzen 5 2400G'], [], 40, 55, ['AM4'], 'AM4'),
  cpu('r5-2600', 'AMD', 'Ryzen 5', 'Ryzen 5 2600', ['R5 2600', '2600 6CORE'], ['26500'], 55, 70, ['AM4'], 'AM4'),
  cpu('r5-3600', 'AMD', 'Ryzen 5', 'Ryzen 5 3600', ['R5 3600', '3600 6CORE'], [], 78, 88, ['AM4', '1080p'], 'AM4'),
  cpu('r5-3600x', 'AMD', 'Ryzen 5', 'Ryzen 5 3600X', ['R5 3600X', '3600X'], [], 76, 82, ['AM4', '1080p'], 'AM4'),
  cpu('r5-4500', 'AMD', 'Ryzen 5', 'Ryzen 5 4500', ['R5 4500'], [], 70, 80, ['AM4', 'esports'], 'AM4'),
  cpu('r5-5500', 'AMD', 'Ryzen 5', 'Ryzen 5 5500', ['R5 5500'], [], 76, 82, ['AM4', 'esports'], 'AM4'),
  cpu('r5-5600', 'AMD', 'Ryzen 5', 'Ryzen 5 5600', ['R5 5600', '5600 non X'], ['5600xnon'], 90, 90, ['AM4', '1080p', 'Fortnite'], 'AM4'),
  cpu('r5-5600x', 'AMD', 'Ryzen 5', 'Ryzen 5 5600X', ['R5 5600X', '5600X'], [], 88, 88, ['AM4', '1080p'], 'AM4'),
  cpu('r7-3700x', 'AMD', 'Ryzen 7', 'Ryzen 7 3700X', ['R7 3700X', '3700X'], [], 74, 78, ['AM4'], 'AM4'),
  cpu('r7-5700x', 'AMD', 'Ryzen 7', 'Ryzen 7 5700X', ['R7 5700X', '5700X'], [], 86, 84, ['AM4', '1440p'], 'AM4'),
  cpu('i5-10400f', 'Intel', 'Core i5', 'Core i5-10400F', ['i5 10400F', '10400F'], [], 72, 80, ['LGA1200', 'esports'], 'LGA1200'),
  cpu('i5-11400f', 'Intel', 'Core i5', 'Core i5-11400F', ['i5 11400F', '11400F'], [], 74, 78, ['LGA1200'], 'LGA1200'),
  cpu('i5-12400f', 'Intel', 'Core i5', 'Core i5-12400F', ['i5 12400F', '12400F'], [], 88, 86, ['LGA1700', '1080p'], 'LGA1700'),
  cpu('i5-13400f', 'Intel', 'Core i5', 'Core i5-13400F', ['i5 13400F', '13400F'], [], 84, 80, ['LGA1700'], 'LGA1700'),
  cpu('i7-10700', 'Intel', 'Core i7', 'Core i7-10700', ['i7 10700', '10700'], [], 68, 70, ['LGA1200'], 'LGA1200'),
  cpu('i7-12700', 'Intel', 'Core i7', 'Core i7-12700', ['i7 12700F', '12700'], [], 80, 74, ['LGA1700'], 'LGA1700'),
];

export const MOTHERBOARD_CHIPSETS: readonly CatalogModel[] = [
  mb('a320-am4', 'A320', 'AM4', ['A320M', 'A320']),
  mb('b350-am4', 'B350', 'AM4', ['B350M', 'B350']),
  mb('b450-am4', 'B450', 'AM4', ['B450M', 'B450']),
  mb('b550-am4', 'B550', 'AM4', ['B550M', 'B550']),
  mb('x370-am4', 'X370', 'AM4', ['X370']),
  mb('x470-am4', 'X470', 'AM4', ['X470']),
  mb('x570-am4', 'X570', 'AM4', ['X570']),
  mb('b650-am5', 'B650', 'AM5', ['B650M', 'B650']),
  mb('x670-am5', 'X670', 'AM5', ['X670E', 'X670']),
  mb('b460-lga1200', 'B460', 'LGA1200', ['B460M', 'B460']),
  mb('b560-lga1200', 'B560', 'LGA1200', ['B560M', 'B560']),
  mb('z490-lga1200', 'Z490', 'LGA1200', ['Z490']),
  mb('b660-lga1700', 'B660', 'LGA1700', ['B660M', 'B660']),
  mb('b760-lga1700', 'B760', 'LGA1700', ['B760M', 'B760']),
  mb('z690-lga1700', 'Z690', 'LGA1700', ['Z690']),
  mb('z790-lga1700', 'Z790', 'LGA1700', ['Z790']),
];

export const REPUTABLE_PSU_BRANDS = [
  'SEASONIC',
  'CORSAIR',
  'BE QUIET',
  'BEQUIET',
  'SUPER FLOWER',
  'EVGA',
  'SEASONIC',
  'COOLER MASTER',
  'FSP',
  'ROSEWILL',
  'THERMALTAKE TOUGHPOWER',
  'SILVERSTONE',
  'NZXT',
  'ANTEC',
] as const;

export const UNSAFE_PSU_HINTS = [
  'UNBRANDED',
  'NO NAME',
  'GENERIC',
  'UNKNOWN PSU',
  'CHEAP PSU',
  'OEM',
] as const;

export const GPU_BOARD_PARTNERS = [
  'SAPPHIRE',
  'PULSE',
  'NITRO',
  'XFX',
  'POWERCOLOR',
  'MSI',
  'ASUS',
  'GIGABYTE',
  'EVGA',
  'ZOTAC',
  'PALIT',
  'PNY',
  'INNO3D',
  'GALAX',
  'GAINWARD',
  'ASROCK',
  'HIS',
] as const;

export const ALL_CATALOG: readonly CatalogModel[] = [
  ...GPU_MODELS,
  ...CPU_MODELS,
  ...MOTHERBOARD_CHIPSETS,
];

export function findCatalogByKey(key: string): CatalogModel | undefined {
  return ALL_CATALOG.find((item) => item.key === key);
}

function gpu(
  key: string,
  manufacturer: string,
  series: string,
  model: string,
  aliases: string[],
  typos: string[],
  demand: number,
  liquidity: number,
  gamingTags: string[],
  vramGb: number,
  memoryType: string,
  typicalBuildBand: string,
): CatalogModel {
  return {
    key,
    type: 'GPU',
    displayName: model,
    manufacturer,
    series,
    model,
    aliases,
    typos,
    demand,
    liquidity,
    gamingTags,
    vramGb,
    memoryType,
    typicalBuildBand,
  };
}

function cpu(
  key: string,
  manufacturer: string,
  series: string,
  model: string,
  aliases: string[],
  typos: string[],
  demand: number,
  liquidity: number,
  gamingTags: string[],
  socket: string,
): CatalogModel {
  return {
    key,
    type: 'CPU',
    displayName: model,
    manufacturer,
    series,
    model,
    aliases,
    typos,
    demand,
    liquidity,
    gamingTags,
    socket,
  };
}

function mb(key: string, chipset: string, socket: string, aliases: string[]): CatalogModel {
  const demand = socket === 'AM4' ? 88 : socket === 'LGA1700' ? 80 : 70;
  return {
    key,
    type: 'MOTHERBOARD',
    displayName: `${chipset} ${socket}`,
    manufacturer: 'UNKNOWN',
    series: socket,
    model: chipset,
    aliases,
    typos: [],
    demand,
    liquidity: demand - 5,
    gamingTags: [socket],
    socket,
    chipset,
  };
}
