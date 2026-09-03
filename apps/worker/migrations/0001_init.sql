-- AbelProcure D1 schema. Observations are append-only.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Europe/London',
  currency TEXT NOT NULL DEFAULT 'GBP',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ebay_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  ebay_username TEXT,
  marketplace_id TEXT NOT NULL DEFAULT 'EBAY_GB',
  connected_at TEXT,
  status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS oauth_tokens (
  id TEXT PRIMARY KEY,
  ebay_account_id TEXT NOT NULL REFERENCES ebay_accounts(id),
  token_kind TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  expires_at TEXT NOT NULL,
  scopes TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS searches (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  query_json TEXT NOT NULL,
  max_item_pence INTEGER,
  min_deal_score REAL,
  frequency_minutes INTEGER NOT NULL DEFAULT 15,
  notify INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS search_runs (
  id TEXT PRIMARY KEY,
  search_id TEXT NOT NULL REFERENCES searches(id),
  started_at TEXT NOT NULL,
  finished_at TEXT,
  result_count INTEGER,
  status TEXT NOT NULL,
  error TEXT
);

CREATE TABLE IF NOT EXISTS listings (
  item_id TEXT PRIMARY KEY,
  marketplace TEXT NOT NULL,
  legacy_item_id TEXT,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  data_source TEXT NOT NULL,
  possible_relist_of TEXT
);

CREATE TABLE IF NOT EXISTS listing_observations (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES listings(item_id),
  observed_at TEXT NOT NULL,
  title TEXT NOT NULL,
  item_pence INTEGER NOT NULL,
  postage_pence INTEGER,
  bid_count INTEGER,
  end_time TEXT,
  buying_options TEXT NOT NULL,
  payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS listing_matches (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES listings(item_id),
  search_id TEXT REFERENCES searches(id),
  model_key TEXT,
  deal_score REAL,
  algorithm_version TEXT NOT NULL,
  matched_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS components (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  manufacturer TEXT,
  model TEXT,
  model_key TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS component_aliases (
  id TEXT PRIMARY KEY,
  component_id TEXT NOT NULL REFERENCES components(id),
  alias TEXT NOT NULL,
  kind TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS market_values (
  id TEXT PRIMARY KEY,
  model_key TEXT NOT NULL,
  kind TEXT NOT NULL,
  confidence TEXT NOT NULL,
  market_pence INTEGER,
  quick_pence INTEGER,
  normal_pence INTEGER,
  optimistic_pence INTEGER,
  target_pence INTEGER,
  sample_size INTEGER NOT NULL DEFAULT 0,
  last_updated TEXT,
  notes TEXT,
  data_source TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS watchlist (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  item_id TEXT NOT NULL REFERENCES listings(item_id),
  created_at TEXT NOT NULL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS auction_tracking (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  item_id TEXT NOT NULL REFERENCES listings(item_id),
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bid_plans (
  id TEXT PRIMARY KEY,
  auction_id TEXT NOT NULL REFERENCES auction_tracking(id),
  my_max_pence INTEGER,
  recommended_max_pence INTEGER,
  manually_bid INTEGER NOT NULL DEFAULT 0,
  do_not_chase INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  item_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  amount_pence INTEGER,
  status TEXT NOT NULL,
  integration_state TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  alert_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  item_id TEXT,
  channel TEXT NOT NULL,
  created_at TEXT NOT NULL,
  read_at TEXT
);

CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  component_type TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  serial TEXT,
  source TEXT,
  ebay_item_id TEXT,
  purchase_date TEXT,
  purchase_pence INTEGER,
  postage_pence INTEGER,
  landed_pence INTEGER,
  condition TEXT,
  tested_status TEXT,
  benchmark_status TEXT,
  build_id TEXT,
  estimated_resale_pence INTEGER,
  actual_resale_pence INTEGER,
  sold_date TEXT,
  profit_pence INTEGER,
  status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS builds (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  target_resale_pence INTEGER,
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS build_components (
  id TEXT PRIMARY KEY,
  build_id TEXT NOT NULL REFERENCES builds(id),
  slot TEXT NOT NULL,
  inventory_id TEXT,
  expected_pence INTEGER,
  bought_pence INTEGER,
  source TEXT,
  acquired_at TEXT,
  status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS purchase_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  inventory_id TEXT,
  model_key TEXT,
  component_type TEXT,
  source TEXT,
  listing_type TEXT,
  purchase_pence INTEGER NOT NULL,
  landed_pence INTEGER NOT NULL,
  sold_pence INTEGER,
  purchase_date TEXT NOT NULL,
  sold_date TEXT,
  days_held INTEGER,
  profit_pence INTEGER,
  roi_bps INTEGER
);

CREATE TABLE IF NOT EXISTS deal_feedback (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  item_id TEXT NOT NULL,
  action TEXT NOT NULL,
  algorithm_version TEXT NOT NULL,
  deal_score REAL,
  landed_pence INTEGER,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS algorithm_versions (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  reason TEXT NOT NULL,
  performance_note TEXT
);

CREATE TABLE IF NOT EXISTS algorithm_weights (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL,
  weights_json TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS algorithm_suggestions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  suggested_json TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS seller_observations (
  id TEXT PRIMARY KEY,
  seller_username TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  feedback_score INTEGER,
  feedback_pct REAL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS webhook_events (
  notification_id TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  received_at TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  status TEXT NOT NULL,
  error TEXT
);

CREATE TABLE IF NOT EXISTS system_jobs (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  scheduled_for TEXT NOT NULL,
  started_at TEXT,
  finished_at TEXT,
  status TEXT NOT NULL,
  detail TEXT
);

CREATE INDEX IF NOT EXISTS idx_obs_item ON listing_observations(item_id, observed_at);
CREATE INDEX IF NOT EXISTS idx_feedback_item ON deal_feedback(item_id);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, created_at);
