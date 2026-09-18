import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CexClient, filterCexOpportunities, runCexScan, type CexOpportunity, type CexScanResult } from '@abelprocure/core';

const STORAGE_KEY = 'abelprocure-cex-scan-v1';

function scanUrl(): string {
  const api = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (api) return `${api.replace(/\/$/, '')}/api/cex/scan`;
  return '/api/cex/scan';
}

interface CexScanContextValue {
  scan: CexScanResult | null;
  busy: boolean;
  error: string | null;
  query: string;
  setQuery: (q: string) => void;
  matches: CexOpportunity[];
  runLive: (query?: string) => Promise<void>;
  runDemo: () => Promise<void>;
  importPayload: (payload: unknown) => Promise<void>;
}

const CexScanContext = createContext<CexScanContextValue | null>(null);

export function CexScanProvider({ children }: { children: ReactNode }) {
  const [scan, setScan] = useState<CexScanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        setScan(JSON.parse(raw) as CexScanResult);
        return;
      }
    } catch {
      /* ignore */
    }
    void runCexScan({ mode: 'demo', allowDemoMarket: true }).then(setScan);
  }, []);

  useEffect(() => {
    if (!scan) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(scan));
    } catch {
      /* quota */
    }
  }, [scan]);

  const post = useCallback(async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(scanUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as CexScanResult;
      setScan((prev) => {
        if (json.status === 'UNAVAILABLE' && json.products.length === 0 && prev?.products.length) {
          return {
            ...prev,
            status: json.status,
            error: json.error,
            logs: json.logs,
            lastSuccessAt: json.lastSuccessAt ?? prev.lastSuccessAt,
          };
        }
        return json;
      });
      if (json.error) setError(json.error);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      const fallback = await runCexScan({
        mode: body.mode === 'import' ? 'import' : body.mode === 'demo' ? 'demo' : 'demo',
        payload: body.payload,
        allowDemoMarket: true,
      });
      if (body.mode === 'live') {
        setScan({
          ...fallback,
          status: 'UNAVAILABLE',
          error: `${message}. Live scan needs the Vite /api/cex/scan endpoint (restart npm run dev) or a Worker URL.`,
        });
      } else {
        setScan(fallback);
      }
    } finally {
      setBusy(false);
    }
  }, []);

  const runLive = useCallback(async (q?: string) => {
    setBusy(true);
    setError(null);
    const queryText = q?.trim() || undefined;
    try {
      const client = new CexClient({ requestDelayMs: 1200, maxRetries: 1 });
      const direct = await runCexScan({
        mode: 'live',
        categories: 'gpu',
        query: queryText,
        client,
        allowDemoMarket: true,
      });
      if (direct.status === 'LIVE' && direct.products.length) {
        setScan(direct);
        return;
      }
      const res = await fetch(scanUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'live', categories: 'gpu', query: queryText }),
      });
      const json = (await res.json()) as CexScanResult;
      if (json.status === 'LIVE' && json.products.length) {
        setScan(json);
        return;
      }
      if (direct.products.length) {
        setScan(direct);
        return;
      }
      setScan((prev) => {
        if (json.products.length) return json;
        if (prev?.products.length) {
          return {
            ...prev,
            status: json.status === 'UNAVAILABLE' ? 'UNAVAILABLE' : prev.status,
            error: json.error ?? direct.error,
            logs: json.logs,
          };
        }
        return json;
      });
      if (json.error || direct.error) setError(json.error ?? direct.error ?? null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setBusy(false);
    }
  }, []);

  const matches = useMemo(
    () => filterCexOpportunities(scan?.opportunities ?? [], query),
    [scan, query],
  );

  const value = useMemo<CexScanContextValue>(
    () => ({
      scan,
      busy,
      error,
      query,
      setQuery,
      matches,
      runLive,
      runDemo: () => post({ mode: 'demo', categories: 'gpu' }),
      importPayload: (payload: unknown) => post({ mode: 'import', categories: 'gpu', payload }),
    }),
    [scan, busy, error, query, matches, post, runLive],
  );

  return <CexScanContext.Provider value={value}>{children}</CexScanContext.Provider>;
}

export function useCexScan(): CexScanContextValue {
  const ctx = useContext(CexScanContext);
  if (!ctx) throw new Error('useCexScan outside CexScanProvider');
  return ctx;
}
