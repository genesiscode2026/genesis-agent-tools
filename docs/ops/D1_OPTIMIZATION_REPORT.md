# GENESIS — D1 Efficiency & Operational Closure

Database: `genesis-revenue-ledger` (Cloudflare D1, Workers Free)
Daily rows_read limit: 5,000,000
Baseline warning: ~87% consumed (~4.35M rows/day)

## Root cause (measured via `wrangler d1 insights`)

`flagshipStats()` — called by `/api/flagships/commercial`, the founder dashboard
auto-refresh (60s), cron, and crawler traffic — issues **4 full-table-scan GROUP BY
queries per call** over two rapidly-growing telemetry tables:

| Query | rows read | runs |
|---|---|---|
| `flagship_activity` GROUP BY (time-bounded) | 2,631,553 | 278 |
| `flagship_observations` latency GROUP BY | 1,264,877 | 387 |
| `flagship_activity` GROUP BY (unbounded) | 945,862 | 119 |
| `flagship_observations` stats GROUP BY | 746,740 | 477 |

**Total: ~5.59M rows/day** from these four families alone.

The `flagship_activity` (~9k rows) and `flagship_observations` (~3k rows) tables
grow ~5,000 rows/day (one row per crawler/discovery 402 challenge), and the
analytics endpoints re-scan them fully on every call. The existing
`(product_id, occurred_at)` indexes could not serve `WHERE occurred_at >= ?`.

## Fixes applied (no payment/replay logic touched)

1. **Indexes** — added `idx_flagship_activity_occurred` and
   `idx_flagship_observations_occurred` so time-bounded scans use the index.
2. **Edge caching** — `/api/flagships/commercial`, `/api/founder-summary`,
   `/api/totals` now cache via the Cloudflare Cache API with `Cache-Control:
   public, max-age=300` (5 min), removing the per-refresh full scans.
3. **Bounded history** — the "all-time" `flagshipStats` view is now bounded to
   90 days (prevents unbounded growth).

## Projection

The 300s cache reduces analytics scan frequency ~5× against the dashboard's 60s
auto-refresh; the `occurred_at` indexes reduce bounded-window row scans. Projected
daily rows_read at current traffic: **≤ 25% of the free allowance**.

## Safety

No caching or optimization was applied to payment integrity, replay protection,
settlement ledger correctness, or one-time authorization state. Unpaid 402
challenges and MCP `tools/call` still write/validate only the minimum required
state, and premium output is never granted without a valid payment.
