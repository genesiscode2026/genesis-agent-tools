# Payment Forensics — 0.001 USDC external event (2026-09-23)

## Verdict: PayAPI settlement-verification canary (confirmed)

The single external 0.001 USDC event is **PayAPI Market's own-wallet settlement
verification canary**, not an independent customer purchase.

## Evidence

| Field | Value |
|---|---|
| Event id | `101f2ab6-5bf3-46e8-9d56-a640508d0ee1` |
| Product | `GEN-FLAG-004:quick` (Release Guardian Quick) |
| Amount | 1000 atomic = 0.001 USDC |
| Payer | `0x7e6b6556322c4e26c567a867964ac793f5ee2b1c` (not founder `0xc6f86e…`/`0x7f2db2…`) |
| Tx hash | `0x545ff79c3b5e75ced27710f057635feb98de11a3ee919b363cfbbe518fc7fadb` |
| On-chain status | `0x1` (success), block 51698712, USDC `AuthorizationUsed` + `Transfer(1000)` |
| Settlement | `SETTLED_EXTERNAL`, `external_flag=1`, `test_flag=0` |
| PayAPI listing | `payment_verified: true`, `status: live`, `slug: genesis-release-guardian` |

## Classification

- `FIRST_EXTERNAL_SETTLEMENT` = **TRUE** (a real external on-chain settlement occurred).
- `FIRST_INDEPENDENT_CUSTOMER` = **FALSE** (the payer is a marketplace verification wallet).
- `MARKET_VALIDATED` = **FALSE**.

PayAPI's documented flow is to send one cheap canary payment from its own wallet
to prove the route settles and returns product before awarding the
settlement-verified badge. This transaction matches that flow exactly (amount =
the listed $0.001 price, product = the submitted Release Guardian Quick route,
timing = immediately after submission).
