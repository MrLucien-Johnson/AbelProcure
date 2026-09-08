export interface GpuPerformanceProfile {
  readonly modelKey: string;
  readonly displayName: string;
  /** Relative 1080p raster index. GTX 1080 ≈ 100. Not a fake benchmark claim. */
  readonly relative1080p: number;
  readonly vramGb: number;
  readonly typicalBoardPowerW: number;
  readonly recommendedPsuW: number;
  readonly generation: string;
  readonly rayTracing: boolean;
  readonly nvencOrAv1: string;
  readonly approxAgeYears: number;
  readonly resaleDesirability: number;
  readonly pciePower: 'none' | '6pin' | '8pin' | '8+6' | '8+8';
}

export const GPU_PERFORMANCE: readonly GpuPerformanceProfile[] = [
  p('gt-1030', 'GT 1030', 18, 2, 30, 300, 'Pascal', false, 'NVENC', 8, 15, 'none'),
  p('gtx-1060', 'GTX 1060', 62, 6, 120, 400, 'Pascal', false, 'NVENC', 8, 40, '6pin'),
  p('gtx-1070', 'GTX 1070', 82, 8, 150, 500, 'Pascal', false, 'NVENC', 8, 48, '8pin'),
  p('gtx-1070-ti', 'GTX 1070 Ti', 90, 8, 180, 500, 'Pascal', false, 'NVENC', 8, 50, '8pin'),
  p('gtx-1080', 'GTX 1080', 100, 8, 180, 500, 'Pascal', false, 'NVENC', 8, 55, '8pin'),
  p('gtx-1080-ti', 'GTX 1080 Ti', 118, 11, 250, 600, 'Pascal', false, 'NVENC', 8, 58, '8+8'),
  p('gtx-1650', 'GTX 1650', 48, 4, 75, 300, 'Turing', false, 'NVENC', 6, 35, 'none'),
  p('gtx-1650-super', 'GTX 1650 Super', 58, 4, 100, 350, 'Turing', false, 'NVENC', 6, 38, '6pin'),
  p('gtx-1660', 'GTX 1660', 68, 6, 120, 450, 'Turing', false, 'NVENC', 6, 50, '8pin'),
  p('gtx-1660-super', 'GTX 1660 Super', 78, 6, 125, 450, 'Turing', false, 'NVENC', 6, 62, '8pin'),
  p('gtx-1660-ti', 'GTX 1660 Ti', 80, 6, 120, 450, 'Turing', false, 'NVENC', 6, 60, '8pin'),
  p('rtx-2060', 'RTX 2060', 88, 6, 160, 500, 'Turing', true, 'NVENC', 6, 58, '8pin'),
  p('rtx-2060-super', 'RTX 2060 Super', 98, 8, 175, 550, 'Turing', true, 'NVENC', 6, 60, '8pin'),
  p('rtx-2070', 'RTX 2070', 105, 8, 175, 550, 'Turing', true, 'NVENC', 6, 55, '8pin'),
  p('rtx-2070-super', 'RTX 2070 Super', 112, 8, 215, 650, 'Turing', true, 'NVENC', 6, 58, '8+6'),
  p('rtx-2080', 'RTX 2080', 120, 8, 215, 650, 'Turing', true, 'NVENC', 6, 52, '8+6'),
  p('rtx-2080-super', 'RTX 2080 Super', 126, 8, 250, 650, 'Turing', true, 'NVENC', 6, 50, '8+8'),
  p('rtx-2080-ti', 'RTX 2080 Ti', 140, 11, 250, 650, 'Turing', true, 'NVENC', 6, 48, '8+8'),
  p('rtx-3050', 'RTX 3050', 70, 8, 130, 550, 'Ampere', true, 'NVENC', 4, 55, '8pin'),
  p('rtx-3060', 'RTX 3060', 95, 12, 170, 550, 'Ampere', true, 'NVENC', 4, 80, '8pin'),
  p('rtx-3060-8gb', 'RTX 3060 8GB', 88, 8, 170, 550, 'Ampere', true, 'NVENC', 4, 62, '8pin'),
  p('rtx-3060-ti', 'RTX 3060 Ti', 118, 8, 200, 600, 'Ampere', true, 'NVENC', 4, 82, '8pin'),
  p('rtx-3070', 'RTX 3070', 132, 8, 220, 650, 'Ampere', true, 'NVENC', 4, 78, '8+8'),
  p('rtx-3070-ti', 'RTX 3070 Ti', 140, 8, 290, 750, 'Ampere', true, 'NVENC', 4, 70, '8+8'),
  p('rtx-4060', 'RTX 4060', 108, 8, 115, 550, 'Ada', true, 'NVENC+AV1', 2, 85, '8pin'),
  p('rx-570', 'RX 570', 55, 4, 150, 450, 'Polaris', false, 'VCE', 8, 30, '8pin'),
  p('rx-580', 'RX 580', 60, 8, 185, 500, 'Polaris', false, 'VCE', 8, 35, '8pin'),
  p('rx-5500-xt', 'RX 5500 XT', 58, 8, 130, 450, 'RDNA', false, 'VCE', 6, 40, '8pin'),
  p('rx-5600-xt', 'RX 5600 XT', 78, 6, 150, 500, 'RDNA', false, 'VCE', 6, 50, '8pin'),
  p('rx-5700', 'RX 5700', 90, 8, 180, 550, 'RDNA', false, 'VCE', 6, 52, '8pin'),
  p('rx-5700-xt', 'RX 5700 XT', 102, 8, 225, 600, 'RDNA', false, 'VCE', 6, 58, '8pin'),
  p('rx-6400', 'RX 6400', 42, 4, 53, 350, 'RDNA2', false, 'VCN', 4, 35, 'none'),
  p('rx-6500-xt', 'RX 6500 XT', 50, 4, 107, 400, 'RDNA2', false, 'VCN', 4, 38, '6pin'),
  p('rx-6600', 'RX 6600', 92, 8, 132, 500, 'RDNA2', false, 'VCN', 4, 88, '8pin'),
  p('rx-6600-xt', 'RX 6600 XT', 105, 8, 160, 550, 'RDNA2', false, 'VCN', 4, 80, '8pin'),
  p('rx-6650-xt', 'RX 6650 XT', 110, 8, 176, 550, 'RDNA2', false, 'VCN', 3, 78, '8pin'),
  p('rx-6700', 'RX 6700', 115, 10, 175, 550, 'RDNA2', false, 'VCN', 4, 75, '8pin'),
  p('rx-6700-xt', 'RX 6700 XT', 125, 12, 230, 650, 'RDNA2', false, 'VCN', 4, 82, '8pin'),
  p('rx-6750-xt', 'RX 6750 XT', 130, 12, 250, 650, 'RDNA2', false, 'VCN', 3, 78, '8pin'),
  p('rx-7600', 'RX 7600', 100, 8, 165, 550, 'RDNA3', false, 'VCN+AV1', 2, 80, '8pin'),
  p('rx-7700-xt', 'RX 7700 XT', 135, 12, 245, 700, 'RDNA3', false, 'VCN+AV1', 2, 75, '8pin'),
];

export function performanceFor(modelKey: string | null): GpuPerformanceProfile | null {
  if (!modelKey) return null;
  return GPU_PERFORMANCE.find((g) => g.modelKey === modelKey) ?? null;
}

function p(
  modelKey: string,
  displayName: string,
  relative1080p: number,
  vramGb: number,
  typicalBoardPowerW: number,
  recommendedPsuW: number,
  generation: string,
  rayTracing: boolean,
  nvencOrAv1: string,
  approxAgeYears: number,
  resaleDesirability: number,
  pciePower: GpuPerformanceProfile['pciePower'],
): GpuPerformanceProfile {
  return {
    modelKey,
    displayName,
    relative1080p,
    vramGb,
    typicalBoardPowerW,
    recommendedPsuW,
    generation,
    rayTracing,
    nvencOrAv1,
    approxAgeYears,
    resaleDesirability,
    pciePower,
  };
}
