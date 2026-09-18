export interface KeywordHit {
  readonly kind: 'POSITIVE' | 'NEGATIVE';
  readonly phrase: string;
  readonly start: number;
  readonly end: number;
}

export const POSITIVE_KEYWORDS = [
  'fully tested',
  'working',
  'stress tested',
  'boxed',
  'receipt',
  'warranty',
  'excellent condition',
  'like new',
  'collected in person',
  'smoke free',
  'pet free',
] as const;

export const NEGATIVE_KEYWORDS = [
  'untested',
  'not tested',
  'spares',
  'repair',
  'fault',
  'faulty',
  'intermittent',
  'artefact',
  'artifact',
  'parts only',
  'no display',
  'bent pins',
  'overheating',
  'overheating',
  'crashes',
  'unknown',
  'powers on only',
  'password locked',
  'bios issue',
  'no returns',
  'missing',
  'damaged',
] as const;

export function analyseDescription(text: string | null | undefined): {
  hits: KeywordHit[];
  positive: string[];
  negative: string[];
} {
  if (!text) {
    return { hits: [], positive: [], negative: [] };
  }
  const lower = text.toLowerCase();
  const hits: KeywordHit[] = [];
  for (const phrase of POSITIVE_KEYWORDS) {
    let from = 0;
    while (from < lower.length) {
      const idx = lower.indexOf(phrase, from);
      if (idx < 0) break;
      hits.push({ kind: 'POSITIVE', phrase, start: idx, end: idx + phrase.length });
      from = idx + phrase.length;
    }
  }
  for (const phrase of NEGATIVE_KEYWORDS) {
    let from = 0;
    while (from < lower.length) {
      const idx = lower.indexOf(phrase, from);
      if (idx < 0) break;
      hits.push({ kind: 'NEGATIVE', phrase, start: idx, end: idx + phrase.length });
      from = idx + phrase.length;
    }
  }
  hits.sort((a, b) => a.start - b.start);
  return {
    hits,
    positive: unique(hits.filter((h) => h.kind === 'POSITIVE').map((h) => h.phrase)),
    negative: unique(hits.filter((h) => h.kind === 'NEGATIVE').map((h) => h.phrase)),
  };
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
