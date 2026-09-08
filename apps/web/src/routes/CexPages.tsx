import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  BUILD4,
  GTX1080_BENCHMARK_LANDED,
  formatGBP,
  gtx1080BenchmarkProfit,
  money,
  runCexScan,
  sortOpportunities,
  type CexOpportunity,
  type CexScanResult,
  type OpportunitySort,
} from '@abelprocure/core';
import { moneyText } from '../state/store';

const SORTS: { id: OpportunitySort; label: string }[] = [
  { id: 'BEST_OPPORTUNITY', label: 'Best opportunity' },
  { id: 'HIGHEST_PROFIT', label: 'Highest profit' },
  { id: 'BEST_ROI', label: 'Best ROI' },
  { id: 'CHEAPEST', label: 'Cheapest' },
  { id: 'BEST_PERFORMANCE_PER_POUND', label: 'Best performance/£' },
  { id: 'BIGGEST_MARKET_DISCOUNT', label: 'Biggest market discount' },
  { id: 'NEW_STOCK', label: 'New stock' },
  { id: 'PRICE_DROP', label: 'Price drop' },
];

function collectionBadge(state: string) {
  const cls = state === 'LIVE' ? 'GOOD' : state === 'CACHED' ? 'WATCH' : state === 'STALE' ? 'WEAK' : 'PASS';
  return <span className={`badge ${cls}`}>{state}</span>;
}

function useCexDemoScan() {
  const [scan, setScan] = useState<CexScanResult | null>(null);
  useEffect(() => {
    let cancelled = false;
    void runCexScan({ mode: 'demo', allowDemoMarket: true }).then((result) => {
      if (!cancelled) setScan(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return scan;
}

function CexLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="page-head">
        <div>
          <h1>CeX UK inventory intelligence</h1>
          <p>
            Standalone CeX GPU scanner with Build 4 profitability. eBay Browse is unchanged. DEMO fixtures are labelled
            DEMO_SYNTHETIC — not live stock.
          </p>
        </div>
      </div>
      <nav className="cex-subnav">
        <NavLink to="/cex" end>Overview</NavLink>
        <NavLink to="/cex/gpus">GPUs</NavLink>
        <NavLink to="/cex/opportunities">Opportunities</NavLink>
        <NavLink to="/cex/history">History</NavLink>
      </nav>
      {children}
    </div>
  );
}

function SortSelect({ sort, onChange }: { sort: OpportunitySort; onChange: (s: OpportunitySort) => void }) {
  return (
    <label>Sort
      <select value={sort} onChange={(e) => onChange(e.target.value as OpportunitySort)}>
        {SORTS.map((s) => (
          <option key={s.id} value={s.id}>{s.label}</option>
        ))}
      </select>
    </label>
  );
}

function GpuTable({
  opportunities,
  diffs,
  sort,
}: {
  opportunities: CexOpportunity[];
  diffs: ReadonlyMap<string, string>;
  sort: OpportunitySort;
}) {
  const rows = sortOpportunities(opportunities, sort, diffs);
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>GPU</th>
            <th>VRAM</th>
            <th>CeX</th>
            <th>Availability</th>
            <th>eBay sold median</th>
            <th>Discount</th>
            <th>1080p /£</th>
            <th>Build 4 resale</th>
            <th>Net</th>
            <th>ROI</th>
            <th>PSU</th>
            <th>CPU</th>
            <th>Decision</th>
            <th>Max buy</th>
            <th>Checked</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.product.boxId}>
              <td>
                {o.product.productUrl ? (
                  <a href={o.product.productUrl} target="_blank" rel="noreferrer">
                    {o.product.normalisedModel ?? o.product.title}
                  </a>
                ) : (
                  o.product.normalisedModel ?? o.product.title
                )}
                <div style={{ color: 'var(--muted)', fontSize: 11 }}>{o.product.title}</div>
              </td>
              <td>{o.product.vramGb ? `${o.product.vramGb}GB` : '—'}</td>
              <td>{o.product.sell ? formatGBP(o.product.sell) : '—'}</td>
              <td>{o.product.availability}</td>
              <td>
                {o.market.marketValue ? formatGBP(o.market.marketValue) : '—'}
                <div style={{ color: 'var(--muted)', fontSize: 11 }}>{o.market.kind}</div>
              </td>
              <td>{o.marketDiscountBps !== null ? `${(o.marketDiscountBps / 100).toFixed(1)}%` : '—'}</td>
              <td>{o.profit.performancePerPound ?? '—'}</td>
              <td>{o.profit.expectedSale ? formatGBP(o.profit.expectedSale) : 'INSUFFICIENT_DATA'}</td>
              <td>{o.profit.net ? formatGBP(o.profit.net) : '—'}</td>
              <td>{o.profit.roiBps !== null ? `${(o.profit.roiBps / 100).toFixed(1)}%` : '—'}</td>
              <td>{o.profit.psu}</td>
              <td>{o.profit.cpuBalance}</td>
              <td>
                <span className={`badge ${o.decision === 'BUY' ? 'STRONG_BUY' : o.decision === 'PASS' ? 'PASS' : 'WATCH'}`}>
                  {o.decision}
                </span>
              </td>
              <td>{formatGBP(money(o.maxBuyPence))}</td>
              <td>{o.product.collectedAt.slice(0, 16).replace('T', ' ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CexOverviewPage() {
  const demoScan = useCexDemoScan();
  const [live, setLive] = useState<CexScanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [sort, setSort] = useState<OpportunitySort>('BEST_OPPORTUNITY');
  const resolved = live ?? demoScan;
  const bench = useMemo(() => gtx1080BenchmarkProfit(), []);
  const api = import.meta.env.VITE_API_BASE_URL as string | undefined;
  const gpuCount = resolved?.products.filter((p) => p.raw.categoryId === 892).length ?? 0;

  return (
    <CexLayout>
      <div className="banner">
        Collection state: {collectionBadge(resolved?.status ?? 'CACHED')}{' '}
        {live ? 'Worker response (may be LIVE, CACHED, STALE, or UNAVAILABLE).' : 'DEMO_SYNTHETIC fixtures — not live CeX stock.'}
        {resolved?.error ? ` ${resolved.error}` : null}
      </div>
      <div className="metrics">
        <div className="metric"><div className="k">Build 4 before GPU</div><div className="v">{formatGBP(BUILD4.costBeforeGpu)}</div></div>
        <div className="metric"><div className="k">1080 offer landed</div><div className="v">{formatGBP(GTX1080_BENCHMARK_LANDED)}</div></div>
        <div className="metric"><div className="k">1080 expected net</div><div className="v">{bench.net ? formatGBP(bench.net) : '—'}</div></div>
        <div className="metric good"><div className="k">CeX GPUs</div><div className="v">{gpuCount}</div></div>
      </div>
      <p>
        CPU: {BUILD4.cpu} · PSU: {BUILD4.psu} · Spare GT 1030 is inventory-only and is <strong>not</strong> auto-allocated.
      </p>
      <div className="actions" style={{ border: 'none', paddingLeft: 0 }}>
        <button
          className="btn primary"
          disabled={busy || !api}
          onClick={async () => {
            if (!api) return;
            setBusy(true);
            try {
              const res = await fetch(`${api.replace(/\/$/, '')}/api/cex/scan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'live', categories: 'gpu' }),
              });
              setLive((await res.json()) as CexScanResult);
            } finally {
              setBusy(false);
            }
          }}
        >
          Live GPU scan
        </button>
      </div>
      {!api ? (
        <p style={{ color: 'var(--muted)' }}>
          No Worker URL configured. Live CeX collection stays on the Worker; this page still scores demo fixtures standalone.
        </p>
      ) : null}
      {resolved ? (
        <>
          <SortSelect sort={sort} onChange={setSort} />
          <GpuTable
            opportunities={resolved.opportunities}
            diffs={new Map(resolved.diffs.map((d) => [d.boxId, d.event]))}
            sort={sort}
          />
        </>
      ) : (
        <p>Scoring demo inventory…</p>
      )}
    </CexLayout>
  );
}

export function CexGpusPage() {
  const scan = useCexDemoScan();
  const [sort, setSort] = useState<OpportunitySort>('CHEAPEST');
  return (
    <CexLayout>
      <div className="banner">GPU inventory · {collectionBadge(scan?.status ?? 'CACHED')}</div>
      <SortSelect sort={sort} onChange={setSort} />
      {scan ? (
        <GpuTable
          opportunities={scan.opportunities}
          diffs={new Map(scan.diffs.map((d) => [d.boxId, d.event]))}
          sort={sort}
        />
      ) : null}
    </CexLayout>
  );
}

export function CexOpportunitiesPage() {
  const scan = useCexDemoScan();
  return (
    <CexLayout>
      <div className="banner">
        Explainable scores. A cheap GPU is not automatically a bargain versus the £100.15 GTX 1080 offer.
      </div>
      {scan?.opportunities.map((o) => (
        <article key={o.product.boxId} className="card" style={{ padding: 16, marginBottom: 14 }}>
          <div className={`badge ${o.decision === 'BUY' ? 'STRONG_BUY' : o.decision === 'PASS' ? 'PASS' : 'WATCH'}`}>
            {o.decision}
          </div>
          <h2>
            {o.product.productUrl ? (
              <a href={o.product.productUrl} target="_blank" rel="noreferrer">{o.product.title}</a>
            ) : (
              o.product.title
            )}
          </h2>
          <p>
            Score {o.score} / 100 · {o.bargainBand} ·{' '}
            {o.beatsGtx1080Benchmark ? 'Beats 1080 @ £100.15' : 'Does not beat 1080 @ £100.15'}
          </p>
          {o.factors.map((f) => (
            <div key={f.key} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{f.label}</span>
                <b>{(f.weighted * 100).toFixed(1)}</b>
              </div>
              <div className="factor-bar"><span style={{ width: `${f.rawScore * 100}%` }} /></div>
              <small style={{ color: 'var(--muted)' }}>{f.note}</small>
            </div>
          ))}
          <ul className="why">{o.reasoning.map((r) => <li key={r}>{r}</li>)}</ul>
        </article>
      ))}
    </CexLayout>
  );
}

export function CexHistoryPage() {
  const scan = useCexDemoScan();
  return (
    <CexLayout>
      <p>Snapshot events for the latest collection. Repeated identical rows are not stored.</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Box</th><th>Event</th><th>Previous</th><th>Current</th></tr>
          </thead>
          <tbody>
            {scan?.diffs.map((d) => (
              <tr key={d.boxId}>
                <td>{d.boxId}</td>
                <td>{d.event}</td>
                <td>{d.previousSellPence !== null ? moneyText(d.previousSellPence) : '—'}</td>
                <td>{d.currentSellPence !== null ? moneyText(d.currentSellPence) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CexLayout>
  );
}
