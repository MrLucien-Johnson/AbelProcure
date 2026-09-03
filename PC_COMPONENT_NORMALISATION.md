# PC component normalisation

Raw titles become structured fields. Every field has `{ value, confidence, evidence }`.

Example:

`SAPPHIRE PULSE AMD RADEON RX6600 8GB GDDR6 GPU GRAPHICS CARD`

```
componentType: GPU
manufacturer: Sapphire
series: Radeon RX
model: RX 6600
variant: Pulse
vramGb: 8
memoryType: GDDR6
```

Parsers exist for GPU, CPU, motherboard, RAM, SSD, HDD, PSU, case, cooler, Wi-Fi, complete PC, and bundles.

Rules:

- Do not invent a model when the title is generic.
- Catalog defaults (e.g. RX 6600 → 8 GB) are low-confidence when the title omitted VRAM.
- `searchExpansionService` (`expandSearch` / `expandKeyword`) adds aliases, no-space variants, typos, and optional “spares or repair” queries.
- PSU brands on the reputable list are separated from generic/unknown units.

See `packages/core/src/parsers/normalise.ts` and `packages/core/src/catalog/models.ts`.
