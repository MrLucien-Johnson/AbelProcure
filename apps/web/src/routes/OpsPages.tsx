import { moneyText, useApp } from '../state/store';

export function SavedSearchesPage() {
  const { state, dispatch } = useApp();
  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Saved searches</h1>
          <p>Each row is a scheduled hunt. Yield = purchases / results. Poor yield can be retired, not auto-deleted.</p>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th><th>Query</th><th>Max</th><th>Min score</th><th>Cadence</th><th>Notify</th><th>Yield</th><th></th>
            </tr>
          </thead>
          <tbody>
            {state.savedSearches.map((s) => (
              <tr key={s.id}>
                <td>{s.name}{s.active ? '' : ' (inactive)'}</td>
                <td>{s.query.keyword}</td>
                <td>{s.maxPricePence ? moneyText(s.maxPricePence) : '—'}</td>
                <td>{s.minDealScore}</td>
                <td>{s.frequency}</td>
                <td>{s.notify ? 'yes' : 'no'}</td>
                <td>{s.resultsSeen ? `${s.purchased}/${s.resultsSeen}` : 'n/a'}</td>
                <td><button className="btn" onClick={() => dispatch({ type: 'TOGGLE_SEARCH', id: s.id })}>{s.active ? 'Retire' : 'Activate'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function InventoryPage() {
  const { state, dispatch } = useApp();
  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Inventory</h1>
          <p>Owned parts, landed cost, allocation and resale.</p>
        </div>
        <button className="btn primary" onClick={() => dispatch({
          type: 'ADD_INVENTORY',
          item: {
            id: `inv-${Date.now()}`,
            component: 'SSD',
            brand: 'WD',
            model: '1TB NVMe',
            source: 'manual',
            purchaseDate: new Date().toISOString().slice(0, 10),
            purchasePence: 2800,
            postagePence: 250,
            landedPence: 3050,
            condition: 'USED_VERY_GOOD',
            status: 'AVAILABLE',
            estimatedResalePence: 4000,
          },
        })}>Add demo part</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>ID</th><th>Part</th><th>Model</th><th>Landed</th><th>Status</th><th>Build</th><th>Est. resale</th></tr>
          </thead>
          <tbody>
            {state.inventory.map((i) => (
              <tr key={i.id}>
                <td>{i.id}</td>
                <td>{i.component}</td>
                <td>{i.brand} {i.model}</td>
                <td>{moneyText(i.landedPence)}</td>
                <td>{i.status}</td>
                <td>{i.buildId ?? '—'}</td>
                <td>{moneyText(i.estimatedResalePence)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function BuildsPage() {
  const { state } = useApp();
  return (
    <div>
      <div className="page-head"><div><h1>Builds</h1><p>Finished-PC profit engine. Deal scores rise when a listing fills a gap.</p></div></div>
      {state.builds.map((b) => {
        const parts = b.slots.reduce((s, x) => s + (x.boughtPence ?? 0), 0);
        const remaining = b.slots.filter((s) => s.status === 'NEEDED');
        const gross = b.targetResalePence - parts;
        const fees = Math.round(b.targetResalePence * 0.128);
        const net = gross - fees - 650;
        return (
          <article key={b.id} className="card" style={{ padding: 16, marginBottom: 16 }}>
            <h2>{b.name}</h2>
            <div className="metrics">
              <div className="metric"><div className="k">Parts cost</div><div className="v">{moneyText(parts)}</div></div>
              <div className="metric"><div className="k">Projected resale</div><div className="v">{moneyText(b.targetResalePence)}</div></div>
              <div className="metric good"><div className="k">Gross</div><div className="v">{moneyText(gross)}</div></div>
              <div className="metric"><div className="k">Est. fees</div><div className="v">{moneyText(fees)}</div></div>
              <div className="metric good"><div className="k">Net</div><div className="v">{moneyText(net)}</div></div>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Slot</th><th>Model</th><th>Bought</th><th>Status</th></tr></thead>
                <tbody>
                  {b.slots.map((s) => (
                    <tr key={s.slot}><td>{s.slot}</td><td>{s.model || '—'}</td><td>{s.boughtPence ? moneyText(s.boughtPence) : '—'}</td><td>{s.status}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ color: 'var(--muted)' }}>{remaining.length} slots still open. Buying a matching listing updates Build 4 contribution on the deal card.</p>
          </article>
        );
      })}
    </div>
  );
}

export function MarketValuesPage() {
  const { state } = useApp();
  return (
    <div>
      <div className="page-head"><div><h1>Market values</h1><p>Personal price book. DEMO rows are synthetic. Production seeds ship empty so we never fabricate live comps.</p></div></div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Model</th><th>Desired buy</th><th>Abs max</th><th>Expected resale</th><th>Min profit</th><th>Confidence</th><th>Notes</th></tr>
          </thead>
          <tbody>
            {state.priceBook.map((p) => (
              <tr key={p.modelKey}>
                <td>{p.displayName}</td>
                <td>{p.desiredBuyPrice ? moneyText(p.desiredBuyPrice.pence) : '—'}</td>
                <td>{p.absoluteMaxBuyPrice ? moneyText(p.absoluteMaxBuyPrice.pence) : '—'}</td>
                <td>{p.expectedResalePrice ? moneyText(p.expectedResalePrice.pence) : '—'}</td>
                <td>{p.minimumAcceptableProfit ? moneyText(p.minimumAcceptableProfit.pence) : '—'}</td>
                <td>{p.confidence}</td>
                <td>{p.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PurchaseHistoryPage() {
  const { state } = useApp();
  const rows = state.purchases;
  const realised = rows.reduce((s, r) => s + ((r.actualResalePence ?? 0) - r.landedPence), 0);
  return (
    <div>
      <div className="page-head"><div><h1>Purchase history</h1><p>Used to improve recommendations. Demo sales are isolated from live statistics.</p></div></div>
      <div className="metrics">
        <div className="metric good"><div className="k">Realised profit</div><div className="v">{moneyText(realised)}</div></div>
        <div className="metric"><div className="k">Best component</div><div className="v">RX 6600</div></div>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Part</th><th>Landed</th><th>Sold</th><th>Profit</th><th>Held</th><th>Source</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.model}</td>
                <td>{moneyText(r.landedPence)}</td>
                <td>{r.actualResalePence ? moneyText(r.actualResalePence) : '—'}</td>
                <td>{r.actualResalePence ? moneyText(r.actualResalePence - r.landedPence) : '—'}</td>
                <td>{r.soldDate && r.purchaseDate ? `${Math.round((Date.parse(r.soldDate) - Date.parse(r.purchaseDate)) / 86400000)}d` : '—'}</td>
                <td>{r.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
