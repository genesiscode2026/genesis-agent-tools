# Release Guardian — check breaking API/schema changes in one x402 call

**Release Guardian is a pay-per-call x402 API that checks API/schema changes for
breaking compatibility before release.** No account, no API key, no subscription.

| | |
|---|---|
| Live endpoint | `POST https://genesis-agent-tools.genesisagenttools.workers.dev/api/flagships/release-guardian` |
| Quick price | **$0.005 USDC** (current live value) |
| Deep price | $0.019 USDC |
| Network / asset | Base (`eip155:8453`) / USDC |
| Payment | x402 v2 (EIP-3009), non-custodial |
| Input | `{ "tier": "quick", "input": { "previous": …, "current": … } }` |
| Output | `SAFE` / `RISKY` / `BREAKING` / `UNKNOWN` / `UNSUPPORTED` |

`previous` / `current` are two versions of the same artifact. Release Guardian
auto-routes across the engines that apply: OpenAPI (`paths`), MCP (`tools`),
SDK (`exports`), JSON Schema (`properties`/`required`), GraphQL, webhook
contract, API response guard, tool contract, and changelog risk.

---

## 1. Unpaid call (expect HTTP 402)

```bash
curl -sS -D - -X POST \
  https://genesis-agent-tools.genesisagenttools.workers.dev/api/flagships/release-guardian \
  -H 'content-type: application/json' \
  -d '{"tier":"quick","input":{"previous":{"paths":{"/users":{},"/users/{id}":{}}},"current":{"paths":{"/users":{}}}}}'
```

The response is HTTP `402` with a base64 `PAYMENT-REQUIRED` header carrying the
challenge: `network` (`eip155:8453`), `asset` (USDC), `payTo` (Exodus treasury),
and `amount` (USDC atomic = 5000 for Quick). An x402 client signs the EIP-3009
authorization and retries with a base64 `PAYMENT-SIGNATURE` header.

## 2. Expected output (Quick, after settlement)

```json
{
  "ok": true,
  "product": "release-guardian",
  "tier": "quick",
  "schema_version": 1,
  "request_id": "…",
  "observed_at": "…",
  "result": {
    "status": "BREAKING",
    "severity": "HIGH",
    "affected_surfaces": ["mcp", "openapi", "sdk"],
    "breaking_count": 1,
    "risk_count": 0
  },
  "confidence": 1,
  "evidence": [ { "kind": "release-engines", "engines": ["mcp","openapi","sdk"], "at": "…" } ],
  "warnings": [],
  "degraded": false,
  "abstained": false
}
```

`result.status` is the single value a CI gate should key off:
- `BREAKING` — a removed endpoint/symbol/property/type; fail the release.
- `RISKY` — an incompatibility detected but not a hard removal; review.
- `SAFE` — all applicable engines pass.
- `UNKNOWN` / `UNSUPPORTED` — no engine matched the supplied input format.

`Deep` (`"tier":"deep"`) returns the full engine breakdown: `engine_results`,
`breaking_changes`, `risk_changes`, and `remediation`.

---

## 3. JavaScript buyer (CI-safe)

See `ci-check.mjs` in this directory. It uses the stock `@x402/fetch` /
`@x402/evm` clients, reads the buyer key from the environment (never hardcoded),
and exits with a machine-readable code.

```bash
npm i @x402/fetch @x402/evm viem
BUYER_PRIVATE_KEY=0x… node ci-check.mjs
```

Exit codes: `0` SAFE · `1` BREAKING · `2` RISKY · `3` UNKNOWN/UNSUPPORTED/error ·
`42` buyer wallet not configured (see wallet requirement below).

## 4. CI examples

- **GitHub Actions** — `github-action.yml`
- **Generic shell CI** — `release-check.sh`

Both fail the pipeline on `BREAKING`/`RISKY`, handle the 402 payment step
through the stock x402 client, and contain no secrets.

---

## Buyer wallet requirement (separate from this repo)

GENESIS never holds buyer funds and never requests private keys. To run these
examples against the live endpoint you must supply a **separately provisioned
Base USDC-funded wallet** via `BUYER_PRIVATE_KEY` (EIP-3009 signing key). This is
your responsibility; store the key in your CI secret manager (e.g. a GitHub
Actions secret), never in source control.

The Agent402 50-settlement gate affects Agent402 *auto-dispatch only*. Direct
x402 buyers (these examples) can purchase Release Guardian without Agent402
routing.
