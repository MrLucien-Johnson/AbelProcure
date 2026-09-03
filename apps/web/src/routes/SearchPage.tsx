import { EMPTY_SEARCH, QUICK_FILTERS, SEARCH_PRESETS, type SearchQuery } from '@abelprocure/core';
import { DealGrid } from '../components/deals/DealCard';
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
  const q = state.searchDraft;
  const results = visibleDeals(state).filter((d) =>
    matches(q, d.listing.title, d.component.componentType.value, d.listing.listingType, d.landed.landedCost.pence),
  );

  const set = (patch: Partial<SearchQuery>) => dispatch({ type: 'SET_SEARCH', query: { ...q, ...patch } });

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Search</h1>
          <p>Advanced filters plus one-click component hunts. Multiple saved searches can run on the worker.</p>
        </div>
      </div>
      <div className="filters">
        <div className="form-grid">
          <label>Keyword<input value={q.keyword ?? ''} onChange={(e) => set({ keyword: e.target.value })} /></label>
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
          <button className="btn" onClick={() => dispatch({ type: 'SET_SEARCH', query: { ...EMPTY_SEARCH } })}>Reset</button>
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
      <div className="section-title">Results ({results.length})</div>
      <DealGrid deals={results} />
    </div>
  );
}
