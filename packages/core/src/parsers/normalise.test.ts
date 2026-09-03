import { describe, expect, it } from 'vitest';
import { parseTitle } from '../parsers/normalise.ts';

describe('component normalisation', () => {
  it('parses a Sapphire Pulse RX 6600 title', () => {
    const n = parseTitle('SAPPHIRE PULSE AMD RADEON RX6600 8GB GDDR6 GPU GRAPHICS CARD');
    expect(n.componentType.value).toBe('GPU');
    expect(n.manufacturer.value).toBe('SAPPHIRE');
    expect(n.model.value).toBe('RX 6600');
    expect(n.variant.value).toBe('PULSE');
    expect(n.vramGb.value).toBe(8);
    expect(n.memoryType.value).toBe('GDDR6');
    expect(n.model.confidence).toBeGreaterThan(0.8);
  });

  it('does not invent a model when the title is generic', () => {
    const n = parseTitle('computer part job lot');
    expect(n.model.value).toBeNull();
    expect(n.componentType.value).toBe('UNKNOWN');
    expect(n.componentType.confidence).toBeLessThan(0.3);
  });

  it('detects AM4 CPU + motherboard + RAM bundles', () => {
    const n = parseTitle('Ryzen 5 3600 + MSI B450 Tomahawk + 16GB DDR4 kit bundle');
    expect(n.isBundle || n.componentType.value === 'BUNDLE').toBe(true);
    expect(n.bundleParts.some((p) => p.model.value === 'Ryzen 5 3600')).toBe(true);
  });

  it('detects complete PCs', () => {
    const n = parseTitle('Gaming PC Ryzen 5 5600 RTX 3060 16GB 1TB NVMe Windows 11');
    expect(n.isCompletePc).toBe(true);
    expect(n.componentType.value).toBe('COMPLETE_PC');
  });

  it('flags unknown PSU brands separately from Corsair', () => {
    const good = parseTitle('Corsair RM650 650W 80+ Gold PSU fully tested');
    const bad = parseTitle('650W power supply generic unbranded');
    expect(good.psuTier.value).toBe('REPUTABLE');
    expect(bad.psuTier.value).toBe('GENERIC_UNKNOWN');
  });
});
