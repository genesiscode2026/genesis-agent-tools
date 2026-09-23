# GENESIS — Agent402 discovery delta (honest)

Generated 2026-09-23. Source: live Agent402 route API, 15 buyer-intent queries (3+ per flagship).

## Before (measured)

| Metric | Value |
|---|---|
| Queries | 15 |
| Appearance rate | 73.3% (11/15) |
| Top-3 rate | 53.3% (8/15) |
| Top-1 rate | 26.7% (4/15) |
| Dispatch-eligible rate | **0% (0/11)** |

### Ranking by flagship
- **Release Guardian** — top-1 on 2/4 intents; `settlement_required` on all.
- **Workflow Runner** — top-1 on "run bounded HTTP/JSON workflow"; `settlement_required`.
- **Research & Evidence** — top-1 to top-3; `settlement_required`.
- **Asset Intelligence** — rank 2–4; `settlement_required`; absent on "check token contract owner on-chain".
- **Agent Assurance** — rank 3 on "audit MCP readiness"; **absent** on "agent security audit" and "MCP tool contract validation".

## After (measured)

No change. No Agent402-ingested metadata was modified (the only discovery-surface change this run was the MCP registry `server.json` description, which Agent402 does **not** ingest — Agent402 reads the x402 manifest + OpenAPI). Re-running the identical corpus would reproduce the identical numbers.

## Why the gap is not closeable this run

Every GENESIS route is `routerDispatchEligible = false`, `routerDispatchReason = "settlement_required"`, with `routerDispatchByChain.base.detail = "below the settlement floor"`.

The Agent402 router only auto-pays a seller on Base once it observes on-chain settlement history above the floor **from enough distinct payers**. GENESIS has:
- 12 self-test settlements (founder-controlled, not counted as market demand), and
- 1 founder E2E self-payment (`0xC6F86e…D144` → itself).

That is **0 distinct external payers**. Closing this gap requires real, independent buyers — exactly the thing being validated — and cannot be fabricated (self-payment for rank/volume is explicitly out of scope).

## Conclusion

- `DISCOVERY_COMPETITIVE` = PARTIAL (indexed, top-3 on 53% of a representative corpus, health 1.0)
- `ROUTER_ELIGIBLE` = FALSE (below settlement floor; 0 distinct payers)
- `MARKET_VALIDATED` = FALSE (0 independent buyers)

Top-3 target **not verified** for this reason; the binding constraint is organic settlement history, not price or metadata.
