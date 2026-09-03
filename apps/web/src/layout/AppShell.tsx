import { NavLink, Outlet } from 'react-router-dom';
import { useApp } from '../state/store';

const NAV = [
  ['/', 'Deal Feed'],
  ['/search', 'Search'],
  ['/saved-searches', 'Saved Searches'],
  ['/auctions', 'Auctions'],
  ['/watchlist', 'Watchlist'],
  ['/offers', 'Offers'],
  ['/inventory', 'Inventory'],
  ['/builds', 'Builds'],
  ['/market-values', 'Market Values'],
  ['/purchase-history', 'Purchase History'],
  ['/algorithm', 'Algorithm'],
  ['/alerts', 'Alerts'],
  ['/settings', 'Settings'],
  ['/status', 'System Status'],
] as const;

export function AppShell() {
  const { state } = useApp();
  const unread = state.alerts.filter((a) => !a.read).length;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <strong>PC PARTS PROCUREMENT</strong>
          <span>AbelProcure · EBAY_GB · DEMO</span>
        </div>
        <nav className="nav-list">
          {NAV.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'}>
              {label}
              {label === 'Alerts' && unread > 0 ? <span className="pill">{unread}</span> : null}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="main">
        <Outlet />
      </main>
      <nav className="mobile-nav">
        <NavLink to="/" end>Feed</NavLink>
        <NavLink to="/search">Search</NavLink>
        <NavLink to="/auctions">Auctions</NavLink>
        <NavLink to="/watchlist">Watch</NavLink>
        <NavLink to="/alerts">Alerts</NavLink>
      </nav>
    </div>
  );
}
