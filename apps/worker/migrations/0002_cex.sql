-- CeX inventory snapshots. Separate from eBay listing IDs.

CREATE TABLE IF NOT EXISTS cex_products (
  box_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  model_key TEXT,
  normalised_model TEXT,
  manufacturer TEXT,
  family TEXT,
  variant TEXT,
  vram_gb INTEGER,
  memory_type TEXT,
  product_url TEXT,
  image_url TEXT,
  category_id INTEGER,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  data_source TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cex_snapshots (
  id TEXT PRIMARY KEY,
  box_id TEXT NOT NULL REFERENCES cex_products(box_id),
  observed_at TEXT NOT NULL,
  sell_pence INTEGER,
  cash_pence INTEGER,
  voucher_pence INTEGER,
  out_of_stock INTEGER NOT NULL,
  ecom_quantity INTEGER,
  event TEXT NOT NULL,
  UNIQUE(box_id, observed_at, sell_pence, out_of_stock, ecom_quantity)
);

CREATE TABLE IF NOT EXISTS cex_runs (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL,
  collection_state TEXT NOT NULL,
  product_count INTEGER,
  new_count INTEGER,
  changed_count INTEGER,
  pages INTEGER,
  error TEXT,
  last_success_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_cex_snap_box ON cex_snapshots(box_id, observed_at);
CREATE INDEX IF NOT EXISTS idx_cex_products_model ON cex_products(model_key);
