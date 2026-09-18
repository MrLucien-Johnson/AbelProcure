import { bandLabel, formatCountdown, formatGBP, minutesRemaining, urgencyLevel, type EvaluatedDeal } from '@abelprocure/core';
import { Link } from 'react-router-dom';
import { useApp } from '../../state/store';

export function DealCard({ deal, compact = false }: { deal: EvaluatedDeal; compact?: boolean }) {
  const { dispatch } = useApp();
  const listing = deal.listing;
  const mins = minutesRemaining(listing.endTime, listing.lastSeenAt);
  const urgency = urgencyLevel(mins);
  const model = deal.component.model.value ?? 'Unrecognised';
  return (
    <article className="card deal-card">
      <div className="deal-visual" aria-hidden="true">
        <div className="chip">
          <span className={`badge ${deal.score.band}`}>{bandLabel(deal.score.band)} {deal.score.total}</span>
          {listing.dataSource === 'DEMO_SYNTHETIC' ? <span className="badge DEMO">DEMO</span> : null}
          {deal.isNew ? <span className="badge NEW">NEW</span> : null}
          {deal.potentialMisprice ? <span className="badge MISPRICE">POTENTIAL_MISPRICE</span> : null}
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 28, color: 'var(--amber)' }}>
            {deal.component.componentType.value ?? 'PART'}
          </div>
          <div style={{ color: 'var(--muted)' }}>{model}</div>
        </div>
      </div>
      <div className="deal-body">
        <h3 className="deal-title">{listing.title}</h3>
        <div className="deal-meta">
          <span>{deal.component.componentType.value}</span>
          <span>{model}</span>
          <span>{listing.condition.replaceAll('_', ' ')}</span>
          <span>{listing.listingType.replaceAll('_', ' ')}</span>
          {listing.bidCount !== null ? <span>{listing.bidCount} bids</span> : null}
        </div>
        <div className="kv">
          <div><span>Item</span><b>{formatGBP(listing.itemPrice)}</b></div>
          <div><span>Postage</span><b>{listing.postage ? formatGBP(listing.postage) : '—'}</b></div>
          <div><span>Landed</span><b>{formatGBP(deal.landed.landedCost)}</b></div>
          <div><span>Market</span><b>{deal.market.marketValue ? formatGBP(deal.market.marketValue) : 'INSUFFICIENT'}</b></div>
          <div><span>Target buy</span><b>{deal.target.recommendedMaxItemBid ? formatGBP(deal.target.recommendedMaxItemBid) : '—'}</b></div>
          <div><span>Resale</span><b>{deal.profit.expectedSalePrice ? formatGBP(deal.profit.expectedSalePrice) : '—'}</b></div>
          <div><span>Flip profit</span><b>{deal.profit.expectedProfit ? formatGBP(deal.profit.expectedProfit) : '—'}</b></div>
          <div><span>Build delta</span><b>{deal.buildImpact?.projectedGross ? formatGBP(deal.buildImpact.projectedGross) : '—'}</b></div>
          <div><span>Deal / Conf / Risk</span><b>{deal.score.total} / {Math.round((deal.component.model.confidence || 0) * 100)} / {deal.riskScore}</b></div>
          <div><span>Seller</span><b>{listing.seller.feedbackPercentage ?? 'n/a'}% · {listing.seller.feedbackScore ?? 'n/a'}</b></div>
        </div>
        {listing.endTime ? (
          <div className={`countdown ${urgency}`} aria-label="Time remaining">
            {formatCountdown(mins)}
          </div>
        ) : null}
        {deal.target.doNotChase ? <div className="banner">DO NOT CHASE — current price exceeds economic maximum.</div> : null}
        {!compact ? (
          <div className="why">
            <strong>WHY</strong>
            <ul>
              {deal.score.reasons.map((r) => <li key={r}>✓ {r}</li>)}
              {deal.score.risks.map((r) => <li key={r} className="risk">! {r}</li>)}
            </ul>
            <div>{deal.score.recommendedAction}</div>
            <div style={{ color: 'var(--muted)', marginTop: 6 }}>{deal.market.kind} · {deal.market.confidence}</div>
          </div>
        ) : null}
      </div>
      <div className="actions">
        <button className="btn" onClick={() => dispatch({ type: 'WATCH', itemId: listing.itemId })}>WATCH</button>
        <button className="btn" onClick={() => dispatch({ type: 'TRACK', itemId: listing.itemId })}>TRACK AUCTION</button>
        <button className="btn" onClick={() => {
          const raw = window.prompt('MY MAX BID (£)', deal.target.recommendedMaxItemBid ? String(deal.target.recommendedMaxItemBid.pence / 100) : '');
          if (!raw) return;
          dispatch({ type: 'SET_MAX', itemId: listing.itemId, pence: Math.round(Number(raw) * 100) });
        }}>SET MAX BID</button>
        <a className="btn primary" href={listing.itemWebUrl} target="_blank" rel="noreferrer">OPEN EBAY</a>
        <button className="btn" onClick={() => dispatch({ type: 'ADD_TO_BUILD', itemId: listing.itemId, buildId: 'build-4' })}>ADD TO BUILD</button>
        <button className="btn danger" onClick={() => dispatch({ type: 'IGNORE', itemId: listing.itemId })}>IGNORE</button>
        <button className="btn good" onClick={() => dispatch({ type: 'FEEDBACK', itemId: listing.itemId, action: 'GOOD_DEAL' })}>GOOD DEAL</button>
        <button className="btn danger" onClick={() => dispatch({ type: 'FEEDBACK', itemId: listing.itemId, action: 'TOO_EXPENSIVE' })}>BAD DEAL</button>
        <Link className="btn" to="/algorithm" onClick={() => dispatch({ type: 'SELECT', itemId: listing.itemId })}>BREAKDOWN</Link>
      </div>
    </article>
  );
}

export function DealGrid({ deals }: { deals: EvaluatedDeal[] }) {
  if (deals.length === 0) return <p>No listings match. Adjust filters or wait for the next search run.</p>;
  return (
    <div className="deal-grid">
      {deals.map((deal) => <DealCard key={deal.listing.itemId} deal={deal} />)}
    </div>
  );
}

export function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className={`metric ${tone ?? ''}`}>
      <div className="k">{label}</div>
      <div className="v">{value}</div>
    </div>
  );
}
