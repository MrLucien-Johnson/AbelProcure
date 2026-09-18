export const DEFAULT_AUCTION_REMINDERS_MINUTES = [24 * 60, 6 * 60, 60, 30, 15, 5, 2] as const;

export function minutesRemaining(endTimeIso: string | null, nowIso = new Date().toISOString()): number | null {
  if (!endTimeIso) return null;
  const end = Date.parse(endTimeIso);
  const now = Date.parse(nowIso);
  if (Number.isNaN(end) || Number.isNaN(now)) return null;
  return Math.round((end - now) / 60_000);
}

export function formatCountdown(minutes: number | null): string {
  if (minutes === null) return '—';
  if (minutes <= 0) return 'ENDED';
  const totalSeconds = Math.max(0, Math.round(minutes * 60));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

export function urgencyLevel(minutes: number | null): 'calm' | 'soon' | 'hot' | 'critical' | 'ended' {
  if (minutes === null) return 'calm';
  if (minutes <= 0) return 'ended';
  if (minutes <= 2) return 'critical';
  if (minutes <= 15) return 'hot';
  if (minutes <= 60) return 'soon';
  return 'calm';
}

export function reminderAlertType(minutes: number): string | null {
  if (minutes <= 2) return 'AUCTION_ENDING_2M';
  if (minutes <= 5) return 'AUCTION_ENDING_5M';
  if (minutes <= 15) return 'AUCTION_ENDING_15M';
  if (minutes <= 30) return 'AUCTION_ENDING_30M';
  if (minutes <= 60) return 'AUCTION_ENDING_1H';
  if (minutes <= 360) return 'AUCTION_ENDING_6H';
  if (minutes <= 1440) return 'AUCTION_ENDING_24H';
  return null;
}
