# Database

Cloudflare D1 (SQLite). Migrations live in `apps/worker/migrations/`.

## Design rule

Listings change. Observations are **append-only**. Never overwrite a historical price/bid/end-time snapshot merely because eBay updated the live listing.

`listings` = identity (`item_id`, `first_seen_at`, `last_seen_at`, `data_source`)  
`listing_observations` = immutable snapshots

`data_source = DEMO_SYNTHETIC` must be excluded from production analytics.

## Tables

users, ebay_accounts, oauth_tokens, searches, search_runs, listings, listing_observations, listing_matches, components, component_aliases, market_values, watchlist, auction_tracking, bid_plans, offers, notifications, inventory, builds, build_components, purchase_history, deal_feedback, algorithm_versions, algorithm_weights, algorithm_suggestions, seller_observations, webhook_events, system_jobs, cex_products, cex_snapshots, cex_runs

See `0001_init.sql` and `0002_cex.sql` for columns and indexes.

## Local / demo

The PWA persists operator decisions in `localStorage` (`abelprocure-state-v2`) so GitHub Pages works without D1. D1 is the production system of record once the Worker is deployed.
