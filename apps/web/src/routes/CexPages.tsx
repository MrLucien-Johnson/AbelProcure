import { useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  BUILD4,
  GTX1080_BENCHMARK_LANDED,
  formatGBP,
  gtx1080BenchmarkProfit,
  money,
  sortOpportunities,
  type CexOpportunity,
  type OpportunitySort,
} from '@abelprocure/core';
import { moneyText } from '../state/store';
import { useCexScan } from '../state/cexScan';

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

function CexLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="page-head">
        <div>
          <h1>CeX UK inventory intelligence</h1>
          <p>
            GPU scanner and Build 4 profitability. Live collection uses CeX&apos;s public JSON API. Demo rows are labelled
            DEMO_SYNTHETIC and are not shop stock.
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

async function readImportFile(file: File): Promise<unknown> {
  const text = await file.text();
  return JSON.parse(text) as unknown;
}

export function CexOverviewPage() {
  const { scan, busy, error, runLive, runDemo, importPayload } = useCexScan();
  const [sort, setSort] = useState<OpportunitySort>('BEST_OPPORTUNITY');
  const [importNote, setImportNote] = useState<string | null>(null);
  const bench = useMemo(() => gtx1080BenchmarkProfit(), []);
  const gpuCount = scan?.products.filter((p) => p.raw.categoryId === 892).length ?? 0;
  const isDemo = scan?.products.some((p) => p.dataSource === 'DEMO_SYNTHETIC') && scan.status !== 'LIVE';

  return (
    <CexLayout>
      <div className="banner">
        Collection state: {collectionBadge(scan?.status ?? 'CACHED')}{' '}
        {isDemo
          ? 'Showing DEMO_SYNTHETIC fixtures — not live CeX stock. Use Live GPU scan or import /boxes JSON.'
          : scan?.status === 'UNAVAILABLE'
            ? 'Live /boxes was blocked (often Cloudflare 403 from datacentre IPs). Import JSON captured in your browser, or rerun from a home IP.'
            : scan?.status === 'LIVE'
              ? 'Live or imported CeX inventory.'
              : null}
        {error ? ` ${error}` : null}
        {scan?.error && scan.error !== error ? ` ${scan.error}` : null}
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
        <button className="btn primary" disabled={busy} onClick={() => void runLive()}>
          {busy ? 'Scanning…' : 'Live GPU scan'}
        </button>
        <button className="btn" disabled={busy} onClick={() => void runDemo()}>Reload demo</button>
        <label className="btn" style={{ display: 'inline-flex', alignItems: 'center' }}>
          Import /boxes JSON
          <input
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              try {
                const payload = await readImportFile(file);
                await importPayload(payload);
                setImportNote(`Imported ${file.name}`);
              } catch (err) {
                setImportNote(err instanceof Error ? err.message : 'Import failed');
              }
            }}
          />
        </label>
      </div>
      <p style={{ color: 'var(--muted)' }}>
        Import: on https://uk.webuy.com/ open DevTools → Network → the <code>boxes</code> request → copy response JSON and save as a file.
        {importNote ? ` ${importNote}` : null}
      </p>
      {scan ? (
        <>
          <SortSelect sort={sort} onChange={setSort} />
          <GpuTable
            opportunities={scan.opportunities}
            diffs={new Map(scan.diffs.map((d) => [d.boxId, d.event]))}
            sort={sort}
          />
        </>
      ) : (
        <p>Scoring inventory…</p>
      )}
    </CexLayout>
  );
}

export function CexGpusPage() {
  const { scan } = useCexScan();
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
  const { scan } = useCexScan();
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
  const { scan } = useCexScan();
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
