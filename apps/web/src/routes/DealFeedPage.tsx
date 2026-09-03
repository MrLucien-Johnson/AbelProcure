import { minutesRemaining } from '@abelprocure/core';
import { DealGrid, Metric } from '../components/deals/DealCard';
import { moneyText, useApp, visibleDeals } from '../state/store';

export function DealFeedPage() {
  const { state } = useApp();
  const deals = visibleDeals(state);
  const ending = deals.filter((d) => {
    const m = minutesRemaining(d.listing.endTime, d.listing.lastSeenAt);
    return m !== null && m <= 60 && m > 0;
  });
  const bin = deals.filter((d) => d.listing.listingType === 'BUY_IT_NOW' && d.score.total >= 70);
  const drops = deals.filter((d) => d.potentialMisprice);
  const builds = deals.filter((d) => d.buildImpact);
  const inventoryCost = state.inventory.reduce((s, i) => s + i.landedPence, 0);
  const expected = state.inventory.reduce((s, i) => s + (i.estimatedResalePence - i.landedPence), 0);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>PC PARTS PROCUREMENT</h1>
          <p>Ranked opportunities for component flips and gaming-PC inventory. Demo fixtures are labelled DEMO_SYNTHETIC.</p>
        </div>
      </div>
      <div className="metrics">
        <Metric label="Hot deals" value={String(deals.filter((d) => d.score.total >= 80).length)} tone="good" />
        <Metric label="Ending < 1h" value={String(ending.length)} tone="warn" />
        <Metric label="Outbid" value="0" />
        <Metric label="Watching" value={String(state.watchlist.length)} />
        <Metric label="Active offers" value="0" />
        <Metric label="Inventory cost" value={moneyText(inventoryCost)} />
        <Metric label="Expected profit" value={moneyText(expected)} tone="good" />
      </div>
      <div className="section-title">🔥 Top opportunities</div>
      <DealGrid deals={deals.slice(0, 4)} />
      <div className="section-title">⏱ Ending soon</div>
      <DealGrid deals={ending} />
      <div className="section-title">💰 Buy It Now bargains</div>
      <DealGrid deals={bin} />
      <div className="section-title">📉 Price / misprice flags</div>
      <DealGrid deals={drops} />
      <div className="section-title">🎯 Build opportunities</div>
      <DealGrid deals={builds} />
    </div>
  );
}
