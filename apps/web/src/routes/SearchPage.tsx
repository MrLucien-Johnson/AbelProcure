import { EMPTY_SEARCH, QUICK_FILTERS, SEARCH_PRESETS, filterCexOpportunities, formatGBP, type SearchQuery } from '@abelprocure/core';
import { Link } from 'react-router-dom';
import { DealGrid } from '../components/deals/DealCard';
import { useCexScan } from '../state/cexScan';
import { useApp, visibleDeals } from '../state/store';

function matches(query: SearchQuery, title: string, type: string | null, listingType: string, landed: number): boolean {
  const hay = title.toLowerCase();
  if (query.keyword && !hay.includes(query.keyword.toLowerCase()) && !type?.toLowerCase().includes(query.keyword.toLowerCase())) {
    if (query.keyword.length > 2 && !hay.replaceAll(' ', '').includes(query.keyword.toLowerCase().replaceAll(' ', ''))) {
      return false;
    }
  }
  if (query.excludeTerms) {
    const banned = query.excludeTerms.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (banned.some((b) => hay.includes(b))) return false;
  }
  if (query.componentType && type !== query.componentType) return false;
  if (query.auctionOnly && !listingType.includes('AUCTION')) return false;
  if (query.buyItNowOnly && listingType !== 'BUY_IT_NOW') return false;
  if (query.bestOffer && listingType !== 'BEST_OFFER') return false;
  if (query.maxLandedPence && landed > query.maxLandedPence) return false;
  if (query.manufacturer && !hay.includes(query.manufacturer.toLowerCase())) return false;
  if (query.model && !hay.includes(query.model.toLowerCase())) return false;
  return true;
}

export function SearchPage() {
  const { state, dispatch } = useApp();
  const { scan, query: cexQuery, setQuery: setCexQuery } = useCexScan();
  const q = state.searchDraft;
  const results = visibleDeals(state).filter((d) =>
    matches(q, d.listing.title, d.component.componentType.value, d.listing.listingType, d.landed.landedCost.pence),
  );
  const cexNeedle = [cexQuery || q.keyword, q.model, q.manufacturer].filter(Boolean).join(' ');
  const cexHits = filterCexOpportunities(scan?.opportunities ?? [], cexNeedle).filter((o) => {
    if (q.componentType === 'GPU' && o.product.raw.categoryId && o.product.raw.categoryId !== 892) return false;
    if (q.componentType === 'CPU' && o.product.raw.categoryId === 892) return false;
    if (q.maxLandedPence && o.product.sell && o.product.sell.pence > q.maxLandedPence) return false;
    return true;
  });

  const set = (patch: Partial<SearchQuery>) => {
    const next = { ...q, ...patch };
    dispatch({ type: 'SET_SEARCH', query: next });
    if (patch.keyword !== undefined) setCexQuery(patch.keyword);
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Search</h1>
          <p>
            Keyword searches eBay deals <strong>and</strong> CeX inventory already collected on{' '}
            <Link to="/cex">CeX UK</Link>. Live CeX shop crawl needs a successful scan or imported /boxes JSON — datacentre IPs often get HTTP 403.
          </p>
        </div>
      </div>
      <div className="filters">
        <div className="form-grid">
          <label>Keyword
            <input
              type="search"
              value={q.keyword ?? ''}
              placeholder="RX 6600 — eBay + CeX"
              onChange={(e) => set({ keyword: e.target.value })}
            />
          </label>
          <label>Component
            <select value={q.componentType ?? ''} onChange={(e) => set({ componentType: e.target.value as SearchQuery['componentType'] })}>
              <option value="">Any</option>
              {['GPU','CPU','MOTHERBOARD','RAM','SSD','PSU','CASE','BUNDLE','COMPLETE_PC'].map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
          <label>Manufacturer<input value={q.manufacturer ?? ''} onChange={(e) => set({ manufacturer: e.target.value })} /></label>
          <label>Model<input value={q.model ?? ''} onChange={(e) => set({ model: e.target.value })} /></label>
          <label>Chipset<input value={q.chipset ?? ''} onChange={(e) => set({ chipset: e.target.value })} /></label>
          <label>Socket<input value={q.socket ?? ''} onChange={(e) => set({ socket: e.target.value })} /></label>
          <label>RAM gen<input value={q.ramGeneration ?? ''} onChange={(e) => set({ ramGeneration: e.target.value })} /></label>
          <label>Max landed £<input type="number" value={q.maxLandedPence ? q.maxLandedPence / 100 : ''} onChange={(e) => set({ maxLandedPence: e.target.value ? Number(e.target.value) * 100 : null })} /></label>
          <label>Seller feedback min<input type="number" value={q.sellerFeedbackMin ?? ''} onChange={(e) => set({ sellerFeedbackMin: e.target.value ? Number(e.target.value) : null })} /></label>
          <label>Exclude terms<input value={q.excludeTerms ?? ''} onChange={(e) => set({ excludeTerms: e.target.value })} /></label>
        </div>
        <div className="actions" style={{ border: 'none' }}>
          <label><input type="checkbox" checked={!!q.auctionOnly} onChange={(e) => set({ auctionOnly: e.target.checked })} /> Auction only</label>
          <label><input type="checkbox" checked={!!q.buyItNowOnly} onChange={(e) => set({ buyItNowOnly: e.target.checked })} /> Buy It Now only</label>
          <label><input type="checkbox" checked={!!q.bestOffer} onChange={(e) => set({ bestOffer: e.target.checked })} /> Best Offer</label>
          <label><input type="checkbox" checked={!!q.endingSoon} onChange={(e) => set({ endingSoon: e.target.checked })} /> Ending soon</label>
          <label><input type="checkbox" checked={q.ukOnly !== false} onChange={(e) => set({ ukOnly: e.target.checked })} /> UK only</label>
          <label><input type="checkbox" checked={q.includePostage !== false} onChange={(e) => set({ includePostage: e.target.checked })} /> Include postage</label>
          <button className="btn primary" onClick={() => dispatch({ type: 'SAVE_SEARCH', name: q.keyword || 'Untitled search' })}>Save search</button>
          <button className="btn" onClick={() => { dispatch({ type: 'SET_SEARCH', query: { ...EMPTY_SEARCH } }); setCexQuery(''); }}>Reset</button>
        </div>
      </div>
      <div className="section-title">Presets</div>
      <div className="actions" style={{ border: 'none', paddingLeft: 0 }}>
        {SEARCH_PRESETS.map((p) => (
          <button key={p.id} className="btn" onClick={() => set({ keyword: p.query, ...p.filters })}>{p.name}</button>
        ))}
      </div>
      <div className="section-title">One-click GPUs</div>
      <div className="actions" style={{ border: 'none', paddingLeft: 0 }}>
        {QUICK_FILTERS.gpu.map((g) => <button key={g.id} className="btn" onClick={() => set({ keyword: g.q, componentType: 'GPU' })}>{g.label}</button>)}
      </div>
      <div className="section-title">CPUs</div>
      <div className="actions" style={{ border: 'none', paddingLeft: 0 }}>
        {QUICK_FILTERS.cpu.map((g) => <button key={g.id} className="btn" onClick={() => set({ keyword: g.q, componentType: 'CPU' })}>{g.label}</button>)}
      </div>
      <div className="section-title">Motherboards / RAM / Storage / PSU / Cases</div>
      <div className="actions" style={{ border: 'none', paddingLeft: 0 }}>
        {[...QUICK_FILTERS.motherboard, ...QUICK_FILTERS.ram, ...QUICK_FILTERS.storage, ...QUICK_FILTERS.psu, ...QUICK_FILTERS.cases].map((g) => (
          <button key={g.id} className="btn" onClick={() => set({ keyword: g.q })}>{g.label}</button>
        ))}
      </div>
      <div className="section-title">CeX inventory ({cexHits.length})</div>
      {scan?.status === 'UNAVAILABLE' ? (
        <p style={{ color: 'var(--muted)' }}>
          Live CeX /boxes is blocked from this IP. Search runs against demo or last imported stock.{' '}
          <Link to="/cex">Open CeX UK</Link> to import JSON or retry live scan.
        </p>
      ) : (
        <p style={{ color: 'var(--muted)' }}>
          Matching collected CeX stock (demo, last scan, or import). One-click GPU chips above also filter this table.
        </p>
      )}
      {cexHits.length === 0 ? (
        <p style={{ color: 'var(--muted)' }}>
          {cexNeedle.trim()
            ? `No CeX matches for “${cexNeedle.trim()}” in the current collected inventory.`
            : 'No CeX inventory loaded yet. Open CeX UK to load demo stock.'}
        </p>
      ) : (
        <div className="table-wrap" style={{ marginBottom: 22 }}>
          <table>
            <thead>
              <tr><th>GPU</th><th>CeX</th><th>Decision</th><th>Net</th><th>Source</th><th></th></tr>
            </thead>
            <tbody>
              {cexHits.slice(0, 20).map((o) => (
                <tr key={o.product.boxId}>
                  <td>
                    {o.product.normalisedModel ?? o.product.title}
                    <div style={{ color: 'var(--muted)', fontSize: 11 }}>{o.product.title}</div>
                  </td>
                  <td>{o.product.sell ? formatGBP(o.product.sell) : '—'}</td>
                  <td>
                    <span className={`badge ${o.decision === 'BUY' ? 'STRONG_BUY' : o.decision === 'PASS' ? 'PASS' : 'WATCH'}`}>
                      {o.decision}
                    </span>
                  </td>
                  <td>{o.profit.net ? formatGBP(o.profit.net) : '—'}</td>
                  <td>{o.product.dataSource === 'DEMO_SYNTHETIC' ? 'DEMO_SYNTHETIC' : o.product.dataSource}</td>
                  <td>
                    {o.product.productUrl ? (
                      <a href={o.product.productUrl} target="_blank" rel="noreferrer">CeX</a>
                    ) : null}
                    {' '}
                    <Link to="/cex">Score</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="section-title">eBay results ({results.length})</div>
      <DealGrid deals={results} />
    </div>
  );
}
