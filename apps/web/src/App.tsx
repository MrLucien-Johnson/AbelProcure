import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './layout/AppShell';
import { DealFeedPage } from './routes/DealFeedPage';
import { SearchPage } from './routes/SearchPage';
import { AuctionsPage, OffersPage, WatchlistPage } from './routes/AuctionsPage';
import { BuildsPage, InventoryPage, MarketValuesPage, PurchaseHistoryPage, SavedSearchesPage } from './routes/OpsPages';
import { AlertsPage, AlgorithmPage, SettingsPage, StatusPage } from './routes/SystemPages';

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DealFeedPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="saved-searches" element={<SavedSearchesPage />} />
        <Route path="auctions" element={<AuctionsPage />} />
        <Route path="watchlist" element={<WatchlistPage />} />
        <Route path="offers" element={<OffersPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="builds" element={<BuildsPage />} />
        <Route path="market-values" element={<MarketValuesPage />} />
        <Route path="purchase-history" element={<PurchaseHistoryPage />} />
        <Route path="algorithm" element={<AlgorithmPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="status" element={<StatusPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
