import { DEFAULT_WEIGHTS, weightsTotal, type ScoreWeights } from '@abelprocure/core';
import { useApp } from '../state/store';

export function AlgorithmPage() {
  const { state, dispatch } = useApp();
  const deal = state.deals.find((d) => d.listing.itemId === state.selectedDealId) ?? state.deals[0];
  const weights = state.weights;
  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Algorithm explorer</h1>
          <p>PCDealScore-v1 is inspectable. Suggestions never silently change production weights.</p>
        </div>
      </div>
      {deal ? (
        <article className="card" style={{ padding: 16, marginBottom: 18 }}>
          <h2>{deal.listing.title}</h2>
          <p>Total {deal.score.total} / 100 · {deal.score.band} · {deal.score.version}</p>
          {deal.score.factors.map((f) => (
            <div key={f.key} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{f.label}</span>
                <b>{f.awarded.toFixed(1)} / {f.max}</b>
              </div>
              <div className="factor-bar"><span style={{ width: `${(f.awarded / f.max) * 100}%` }} /></div>
              <small style={{ color: 'var(--muted)' }}>{f.reason}</small>
            </div>
          ))}
          <p><strong>Recommended:</strong> {deal.score.recommendedAction}</p>
        </article>
      ) : null}

      <h2>Weights (must total 100)</h2>
      <p>Current total: {weightsTotal(weights)}</p>
      <div className="form-grid">
        {(Object.keys(DEFAULT_WEIGHTS) as (keyof ScoreWeights)[]).map((key) => (
          <label key={key}>{key}
            <input type="number" value={weights[key]} onChange={(e) => dispatch({ type: 'WEIGHTS', weights: { ...weights, [key]: Number(e.target.value) } })} />
          </label>
        ))}
      </div>

      <h2>Suggested algorithm updates</h2>
      {state.suggestions.length === 0 ? <p>Mark more GOOD DEAL / TOO EXPENSIVE decisions to generate human-in-the-loop suggestions.</p> : null}
      {state.suggestions.map((s) => (
        <article key={s.id} className="card" style={{ padding: 16, marginBottom: 12 }}>
          <h3>{s.title}</h3>
          <p>{s.detail}</p>
          <p>Current target: {s.currentTarget ? `£${s.currentTarget.pence / 100}` : '—'} · Suggested: {s.suggestedTarget ? `£${s.suggestedTarget.pence / 100}` : '—'}</p>
          <div className="actions" style={{ border: 'none' }}>
            <button className="btn good" onClick={() => dispatch({ type: 'SUGGESTION', id: s.id, status: 'ACCEPTED' })}>ACCEPT</button>
            <button className="btn danger" onClick={() => dispatch({ type: 'SUGGESTION', id: s.id, status: 'REJECTED' })}>REJECT</button>
            <button className="btn" onClick={() => dispatch({ type: 'SUGGESTION', id: s.id, status: 'EDITED' })}>EDIT</button>
          </div>
        </article>
      ))}

      <h2>Backtest</h2>
      <p>Once enough labelled history exists, a proposed weight set can be replayed against previous opportunities without using information that was not available at decision time. Current sample is too small for a live comparison — DEMO precision is illustrative only and excluded from production stats.</p>
    </div>
  );
}

export function AlertsPage() {
  const { state, dispatch } = useApp();
  return (
    <div>
      <div className="page-head"><div><h1>Alerts</h1><p>In-app and browser notifications. Email / Telegram / Discord are optional adapters.</p></div></div>
      {state.alerts.map((a) => (
        <article key={a.id} className="card" style={{ padding: 14, marginBottom: 10 }}>
          <div className="badge">{a.severity}</div>
          <h3>{a.title}</h3>
          <p>{a.body}</p>
          <small>{a.type} · {a.at}</small>
          {!a.read ? <div><button className="btn" onClick={() => dispatch({ type: 'READ_ALERT', id: a.id })}>Mark read</button></div> : null}
        </article>
      ))}
    </div>
  );
}

const STEPS = [
  'Connect eBay Developer application',
  'Verify API credentials',
  'Connect eBay user OAuth',
  'Test Browse API',
  'Configure notification endpoint',
  'Test webhook',
  'Activate saved searches',
];

export function SettingsPage() {
  const { state, dispatch } = useApp();
  return (
    <div>
      <div className="page-head"><div><h1>Settings</h1><p>Connection wizard. The PWA stays in DEMO until the Worker has secrets.</p></div></div>
      <ol>
        {STEPS.map((label, i) => (
          <li key={label} style={{ marginBottom: 10 }}>
            <strong>STEP {i + 1}</strong> {label}
            {state.wizardStep === i + 1 ? ' ← current' : ''}
          </li>
        ))}
      </ol>
      <button className="btn" onClick={() => dispatch({ type: 'WIZARD', step: Math.min(7, state.wizardStep + 1) })}>Next step</button>
      <h2>Notification channels</h2>
      <ul>
        <li>IN APP — READY</li>
        <li>BROWSER / PWA — READY when permission granted</li>
        <li>EMAIL — CONFIGURATION_REQUIRED</li>
        <li>TELEGRAM — CONFIGURATION_REQUIRED</li>
        <li>DISCORD — CONFIGURATION_REQUIRED</li>
      </ul>
      <button className="btn primary" onClick={async () => {
        if (!('Notification' in window)) return;
        await Notification.requestPermission();
        if (Notification.permission === 'granted') {
          new Notification('AbelProcure', { body: 'Browser notifications enabled. Auction timers still need the Worker for background delivery.' });
        }
      }}>Enable browser notifications</button>
    </div>
  );
}

export function StatusPage() {
  const api = import.meta.env.VITE_API_BASE_URL as string | undefined;
  return (
    <div>
      <div className="page-head"><div><h1>System status</h1><p>Honest integration states. Nothing is marked live until it has actually connected.</p></div></div>
      {[
        ['GITHUB_PAGES', 'READY'],
        ['BACKEND', api ? 'CONFIGURATION_REQUIRED' : 'DEMO / CONFIGURATION_REQUIRED'],
        ['DATABASE', 'CONFIGURATION_REQUIRED'],
        ['EBAY_BROWSE_API', 'EBAY_CREDENTIALS_REQUIRED'],
        ['EBAY_USER_OAUTH', 'EBAY_USER_AUTHORIZATION_REQUIRED'],
        ['EBAY_NOTIFICATIONS', 'CONFIGURATION_REQUIRED'],
        ['SEARCH_SCHEDULER', 'CONFIGURATION_REQUIRED'],
        ['ALERT_ENGINE', 'DEMO'],
        ['OFFER_API / AUTO BID', 'DISABLED_PENDING_EBAY_APPROVAL'],
      ].map(([k, v]) => (
        <div key={k} className="status-row"><span>{k}</span><span className="pill">{v}</span></div>
      ))}
    </div>
  );
}
