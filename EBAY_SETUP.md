# eBay setup

Official Browse, Identity, and Notification APIs. Do not scrape HTML.

The developer portal HTML was not fetchable (HTTP 403) from the build environment. Confirm field names in your eBay developer account if the portal UI has changed.

## 1. Create an eBay developer account

1. Go to https://developer.ebay.com/ and register.
2. Create an application (Production, not only Sandbox, when you are ready for live UK listings).
3. Note **App ID (Client ID)** and **Cert ID (Client Secret)**.

## 2. Configure OAuth

1. Add a RuName / redirect URI pointing at the Worker:
   - Production: `https://<your-worker>.workers.dev/oauth/ebay/callback`
   - Local: `http://127.0.0.1:8787/oauth/ebay/callback`
2. Enable **Authorization Code** grant.
3. Application token (client credentials) is enough for Browse search.
4. User token is only required for user-specific bidding/offer data — and bidding stays disabled until Offer API approval.

**Scopes (minimal):**

- `https://api.ebay.com/oauth/api_scope` (Browse)

Do not request `buy.offer.auction` until eBay has approved Limited Release access.

## 3. Marketplace

Always send:

```
X-EBAY-C-MARKETPLACE-ID: EBAY_GB
Accept-Language: en-GB
```

Optional shipping accuracy:

```
X-EBAY-C-ENDUSERCTX: contextualLocation=country=GB,zip=YOUR_POSTCODE
```

**Browse search returns Buy It Now only by default.** Auction discovery must use:

```
filter=buyingOptions:{AUCTION|FIXED_PRICE|BEST_OFFER}
```

The adapter already does this.

## 4. GitHub / Cloudflare secrets

Set on the Worker (never in the Pages bundle):

1. `EBAY_CLIENT_ID`
2. `EBAY_CLIENT_SECRET`
3. `EBAY_REDIRECT_URI`
4. `EBAY_RU_NAME` (if required by your app)
5. `TOKEN_ENCRYPTION_KEY` (long random string)
6. `WEBHOOK_VERIFICATION_TOKEN`
7. `ALLOWED_ORIGINS` (GitHub Pages origin + localhost)
8. `APP_BASE_URL` (Worker URL)

Optional: `EBAY_BUYER_POSTAL_CODE`, `VAPID_*`, Telegram/Discord/SMTP.

## 5. Notifications

1. In the eBay developer portal, register destination `https://<worker>/webhooks/ebay`.
2. Complete the challenge handshake.
3. Subscribe only to topics you are allowed: `MARKETPLACE_ACCOUNT_DELETION`, `ITEM_PRICE_REVISION`, `ITEM_AVAILABILITY`.
4. If a buyer topic is not available, leave it as `EBAY_PERMISSION_REQUIRED`. Do not fake it.

## 6. Offer API / automatic bidding

`POST /buy/offer/v1_beta/bidding/{itemId}/place_proxy_bid` is **Limited Release**.

This app records max bids and opens the real eBay listing. It will not place bids until you have written approval and explicitly enable a future `BiddingProvider`.

## 7. Sold prices

Do not assume Marketplace Insights is available. Until a verified sold-price API is approved, populate the **personal price book** and treat everything else as `ACTIVE_LISTING_ESTIMATE`.
