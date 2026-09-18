# Algorithm

## Versions

| Version | Date | Notes |
| --- | --- | --- |
| `PCDealScore-v1` | 2026-09-03 | Initial inspectable weighted model |

Every purchasing decision stores the algorithm version used at the time. Weight edits create a new version conceptually; they are **not** applied silently from feedback.

## Weights (must sum to 100)

| Factor | Default |
| --- | --- |
| PRICE_VALUE | 25 |
| EXPECTED_PROFIT | 20 |
| ROI | 10 |
| COMPONENT_DEMAND | 10 |
| BUILD_USEFULNESS | 10 |
| SELLER_QUALITY | 7 |
| CONDITION_CONFIDENCE | 5 |
| AUCTION_OPPORTUNITY | 5 |
| SEARCH_RARITY | 3 |
| COMPATIBILITY | 3 |
| LIQUIDITY | 2 |

Editable in `/algorithm`. Invalid totals throw in the scorer.

## Market evidence

| Kind | Meaning |
| --- | --- |
| `USER_PRICE_BOOK` | Owner-entered targets/resale |
| `VERIFIED_SOLD_PRICE_DATA` | Only if a sold-price API is later approved |
| `ACTIVE_LISTING_ESTIMATE` | Asking prices / demo estimates — **never labelled as sold** |

Confidence: `HIGH` / `MEDIUM` / `LOW` / `INSUFFICIENT_DATA`.

`POTENTIAL_MISPRICE` requires MEDIUM or HIGH confidence.

## Money

```
landedCost = item + postage + buyerFees + collection + expectedRepair

expectedProfit (net) = sale − landed − sellingFees − outboundPostage − packaging − repair

grossMargin = sale − landed
ROI = net / landed
```

Target buy:

```
maxLanded = sale − minProfit − fees − outboundPostage − packaging − repairReserve
maxItemBid = maxLanded − inboundPostage
```

If current bid > max item bid: **DO NOT CHASE**.

## Dual purpose

1. Component flip — net on the part alone.
2. Build contribution — “If I buy this for Build 4, what happens to parts cost and projected PC profit?”

## Learning

Feedback actions are stored. Suggestions appear as `SUGGESTED ALGORITHM UPDATE` with ACCEPT / REJECT / EDIT. Production weights do not change unless you accept.

## Backtesting

Replays labelled opportunities with a proposed weight set using only data available at decision time. Disabled until enough non-demo history exists.
