import type { FeedbackAction } from '../types/enums.ts';
import { money, type Money } from '../money/money.ts';

export interface DecisionRecord {
  readonly modelKey: string;
  readonly action: FeedbackAction;
  readonly landedPence: number;
  readonly targetPence: number | null;
  readonly sellerFeedbackPct: number | null;
  readonly listingType: string;
}

export interface AlgorithmSuggestion {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
  readonly suggestedTarget: Money | null;
  readonly currentTarget: Money | null;
  readonly sampleSize: number;
  readonly status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EDITED';
}

export function suggestFromDecisions(
  decisions: readonly DecisionRecord[],
  currentTargets: Readonly<Record<string, number | null>>,
): AlgorithmSuggestion[] {
  const byModel = new Map<string, DecisionRecord[]>();
  for (const d of decisions) {
    const list = byModel.get(d.modelKey) ?? [];
    list.push(d);
    byModel.set(d.modelKey, list);
  }
  const suggestions: AlgorithmSuggestion[] = [];
  for (const [model, rows] of byModel) {
    if (rows.length < 5) continue;
    const rejects = rows.filter((r) =>
      ['TOO_EXPENSIVE', 'NOT_PROFITABLE', 'NOT_INTERESTED', 'IGNORE'].includes(r.action),
    );
    const buys = rows.filter((r) => ['BUY', 'PURCHASED', 'GOOD_DEAL', 'BID'].includes(r.action));
    if (rejects.length >= 4) {
      const over = rejects.filter((r) => r.targetPence !== null && r.landedPence > (r.targetPence ?? 0) * 0.85);
      const pct = Math.round((over.length / rejects.length) * 100);
      if (pct >= 70) {
        const maxPaid = buys.length ? Math.max(...buys.map((b) => b.landedPence)) : null;
        const suggested = maxPaid ?? Math.round(median(rejects.map((r) => r.landedPence)) * 0.9);
        const current = currentTargets[model] ?? null;
        suggestions.push({
          id: `sug-${model}-target`,
          title: 'SUGGESTED ALGORITHM UPDATE',
          detail: `Based on ${rows.length} decisions, you reject ${model} listings near or above current target ${pct}% of the time.`,
          suggestedTarget: money(suggested),
          currentTarget: current === null ? null : money(current),
          sampleSize: rows.length,
          status: 'PENDING',
        });
      }
    }
  }
  return suggestions;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  const a = s[mid] ?? 0;
  const b = s[mid - 1] ?? a;
  return s.length % 2 === 0 ? Math.round((a + b) / 2) : a;
}
