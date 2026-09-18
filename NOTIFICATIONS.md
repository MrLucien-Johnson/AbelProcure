# Notifications

## In-app / PWA (core)

- In-app inbox on `/alerts`
- Browser Notification API (permission prompt in Settings)
- Local auction countdowns while the PWA is open

Background delivery when the phone is locked requires the Worker cron + (optional) Web Push VAPID keys. Until `VAPID_*` secrets exist: `CONFIGURATION_REQUIRED`.

## Severity examples

Critical: `OUTBID`, `AUCTION_ENDING_5M`, `AUCTION_ENDING_2M`  
Opportunity: `NEW_DEAL_SCORE_90_PLUS`, `BUY_IT_NOW_BELOW_TARGET`

Default reminder offsets: 24h, 6h, 1h, 30m, 15m, 5m, 2m.

## Optional adapters (not required)

| Channel | Status |
| --- | --- |
| EMAIL | CONFIGURATION_REQUIRED (`SMTP_*`) |
| TELEGRAM | CONFIGURATION_REQUIRED (`TELEGRAM_*`) |
| DISCORD | CONFIGURATION_REQUIRED (`DISCORD_WEBHOOK_URL`) |

## eBay webhooks

HTTPS Worker route: `POST /webhooks/ebay`

Implemented topics (when subscribed): `MARKETPLACE_ACCOUNT_DELETION`, `ITEM_PRICE_REVISION`, `ITEM_AVAILABILITY`, `AUTHORIZATION_REVOCATION`.

Buyer topics (`BID_PLACED`, `OUTBID`, `AUCTION_WON`, offer activity, seller counteroffer) are Trading API Platform Notifications, not REST topics. Marked **`EBAY_PERMISSION_REQUIRED`**. Fallback: Browse `getItem` polling for watched auctions.

The handler is idempotent (`webhook_events.notification_id` primary key).
