/**
 * Integer-pence money. Never use IEEE floats as the source of truth for GBP.
 * Display may convert to pounds; arithmetic stays in pence.
 */

export const DEFAULT_CURRENCY = 'GBP' as const;
export type CurrencyCode = typeof DEFAULT_CURRENCY;

export interface Money {
  readonly pence: number;
  readonly currency: CurrencyCode;
}

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneyError';
  }
}

function assertPence(value: number, label = 'amount'): void {
  if (!Number.isFinite(value)) {
    throw new MoneyError(`${label} is not finite`);
  }
  if (!Number.isInteger(value)) {
    throw new MoneyError(`${label} must be integer pence, received ${value}`);
  }
}

export function money(pence: number, currency: CurrencyCode = DEFAULT_CURRENCY): Money {
  assertPence(pence);
  if (currency !== DEFAULT_CURRENCY) {
    throw new MoneyError(`Unsupported currency ${currency}`);
  }
  return { pence, currency };
}

export const ZERO = money(0);

/** Parse user/display pounds (e.g. 12.5 or "12.50") to pence. */
export function fromPounds(pounds: number | string): Money {
  const text = typeof pounds === 'number' ? pounds.toString() : pounds.trim();
  if (text === '') {
    throw new MoneyError('empty pounds value');
  }
  const negative = text.startsWith('-');
  const unsigned = negative ? text.slice(1) : text;
  const match = unsigned.match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) {
    throw new MoneyError(`Cannot parse pounds: ${text}`);
  }
  const whole = Number(match[1]);
  const frac = (match[2] ?? '00').padEnd(2, '0');
  const pence = whole * 100 + Number(frac);
  return money(negative ? -pence : pence);
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.pence + b.pence, a.currency);
}

export function sum(amounts: readonly Money[]): Money {
  return amounts.reduce((acc, item) => add(acc, item), ZERO);
}

export function sub(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.pence - b.pence, a.currency);
}

export function mulInt(a: Money, factor: number): Money {
  assertPence(factor, 'factor');
  return money(a.pence * factor, a.currency);
}

/**
 * Apply a percentage with integer basis points (1% = 100 bps).
 * Rounded to nearest pence (half away from zero).
 */
export function percentBps(a: Money, bps: number): Money {
  assertPence(bps, 'bps');
  const raw = a.pence * bps;
  const rounded = divideRoundNearest(raw, 10_000);
  return money(rounded, a.currency);
}

export function ratioBps(numerator: Money, denominator: Money): number | null {
  assertSameCurrency(numerator, denominator);
  if (denominator.pence === 0) {
    return null;
  }
  return divideRoundNearest(numerator.pence * 10_000, denominator.pence);
}

export function minMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return a.pence <= b.pence ? a : b;
}

export function maxMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return a.pence >= b.pence ? a : b;
}

export function isZero(a: Money): boolean {
  return a.pence === 0;
}

export function compare(a: Money, b: Money): number {
  assertSameCurrency(a, b);
  return a.pence - b.pence;
}

export function formatGBP(a: Money): string {
  const sign = a.pence < 0 ? '-' : '';
  const abs = Math.abs(a.pence);
  const pounds = Math.floor(abs / 100);
  const pence = abs % 100;
  return `${sign}£${pounds.toLocaleString('en-GB')}.${pence.toString().padStart(2, '0')}`;
}

export function toPoundsNumber(a: Money): number {
  return a.pence / 100;
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new MoneyError(`Currency mismatch ${a.currency} vs ${b.currency}`);
  }
}

function divideRoundNearest(numerator: number, denominator: number): number {
  if (denominator === 0) {
    throw new MoneyError('division by zero');
  }
  const negative = numerator < 0 !== denominator < 0;
  const absN = Math.abs(numerator);
  const absD = Math.abs(denominator);
  const q = Math.floor(absN / absD);
  const r = absN % absD;
  const rounded = r * 2 >= absD ? q + 1 : q;
  return negative ? -rounded : rounded;
}
