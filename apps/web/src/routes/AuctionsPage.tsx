import { formatCountdown, minutesRemaining, urgencyLevel } from '@abelprocure/core';
import { DealCard } from '../components/deals/DealCard';
import { useApp, visibleDeals } from '../state/store';

const GROUPS = [
  ['ENDING_SOON', 'Ending soon'],
  ['CURRENTLY_WINNING', 'Currently winning'],
  ['OUTBID', 'Outbid'],
  ['WATCHING', 'Watching'],
  ['BID_PLANNED', 'Bid planned'],
  ['WON', 'Won'],
  ['LOST', 'Lost'],
  ['ENDED', 'Ended'],
] as const;

export function AuctionsPage() {
  const { state, dispatch } = useApp();
  const auctions = visibleDeals(state).filter((d) => d.listing.listingType.includes('AUCTION'));
  const grouped = {
    ENDING_SOON: auctions.filter((d) => (minutesRemaining(d.listing.endTime, d.listing.lastSeenAt) ?? 999) <= 60),
    CURRENTLY_WINNING: [],
    OUTBID: [],
    WATCHING: auctions.filter((d) => state.trackedAuctions.includes(d.listing.itemId)),
    BID_PLANNED: auctions.filter((d) => state.bidPlans.some((b) => b.itemId === d.listing.itemId)),
    WON: [],
    LOST: [],
    ENDED: auctions.filter((d) => (minutesRemaining(d.listing.endTime, d.listing.lastSeenAt) ?? 1) <= 0),
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Auction command centre</h1>
          <p>Live countdowns, recommended max bids, and a hard DO NOT CHASE line. Automatic bidding is DISABLED_PENDING_EBAY_APPROVAL.</p>
        </div>
      </div>
      <div className="banner">OUTBID / CURRENTLY WINNING require buyer notification permission or Offer API access. Those rows stay empty until eBay grants it. Polling + local timers still run.</div>
      {GROUPS.map(([key, label]) => (
        <section key={key}>
          <div className="section-title">{label}</div>
          <div className="deal-grid">
            {grouped[key].map((deal) => {
              const plan = state.bidPlans.find((b) => b.itemId === deal.listing.itemId);
              const mins = minutesRemaining(deal.listing.endTime, deal.listing.lastSeenAt);
              return (
                <div key={deal.listing.itemId}>
                  <div className={`countdown ${urgencyLevel(mins)}`}>{formatCountdown(mins)}</div>
                  {plan ? <p>MY MAX BID: £{((plan.myMaxPence ?? 0) / 100).toFixed(2)} {plan.manuallyBid ? '· marked bid' : ''}</p> : null}
                  <p>RECOMMENDED MAX ITEM BID: {deal.target.recommendedMaxItemBid ? `£${(deal.target.recommendedMaxItemBid.pence / 100).toFixed(2)}` : '—'}</p>
                  <button className="btn" onClick={() => dispatch({ type: 'MARK_BID', itemId: deal.listing.itemId })}>I BID MANUALLY ON EBAY</button>
                  <DealCard deal={deal} compact />
                </div>
              );
            })}
            {grouped[key].length === 0 ? <p style={{ color: 'var(--muted)' }}>None in this bucket.</p> : null}
          </div>
        </section>
      ))}
    </div>
  );
}

export function WatchlistPage() {
  const { state } = useApp();
  const deals = visibleDeals(state).filter((d) => state.watchlist.includes(d.listing.itemId));
  return (
    <div>
      <div className="page-head"><div><h1>Watchlist</h1><p>Listings you explicitly kept an eye on.</p></div></div>
      <div className="deal-grid">{deals.map((d) => <DealCard key={d.listing.itemId} deal={d} />)}</div>
    </div>
  );
}

export function OffersPage() {
  const deals = useApp().state.deals.filter((d) => d.listing.listingType === 'BEST_OFFER');
  return (
    <div>
      <div className="page-head"><div><h1>Offers</h1><p>Best Offer listings. Sending offers via API is EBAY_PERMISSION_REQUIRED.</p></div></div>
      <div className="banner">Negotiation / offer APIs are limited-release. You can open eBay and record intent here.</div>
      <div className="deal-grid">{deals.map((d) => <DealCard key={d.listing.itemId} deal={d} />)}</div>
    </div>
  );
}
