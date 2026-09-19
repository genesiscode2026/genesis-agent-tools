# GENESIS Agent Tools

Deterministic, pay-per-call compatibility gates for AI agents and CI/CD pipelines.
**Settlement: USDC on Base (x402).** No LLM, no paid API, no proprietary source in this repo.

## Public origin
`https://genesis-agent-tools.genesisagenttools.workers.dev` (stable — see `/status`)

## Services

| Tool | Endpoint | Price | Input | Output |
|---|---|---|---|---|
| GENESIS Compatibility Preflight (FREE) | `POST /api/preflight` | 0 USDC | any API/MCP/SDK manifest | classification + recommended paid service |
| MCP Schema Drift Gate | `POST /api/mcp-schema-drift` | 0.05 USDC | two MCP tool manifests | PASS/FAIL + breaking changes + hash |
| OpenAPI Breaking Change Gate | `POST /api/openapi-breaking-change` | 0.05 USDC | two OpenAPI specs | PASS/FAIL + severity + hash |
| SDK Compatibility Gate | `POST /api/sdk-compatibility` | 0.10 USDC | two SDK export manifests | PASS/FAIL + score + SemVer impact + hash |

## Payment (x402)
- Network: **Base** (chain 8453)
- Asset: **USDC**
- Recipient: `0xC6F86e170411182114FcCdb28793dC76B5e8D144`
- Unpaid request to a paid endpoint returns **HTTP 402** with the payment challenge.

Example (agent-native): `curl -X POST https://<origin>/api/mcp-schema-drift` → `402` with `payTo/asset/network/amount`.

## Machine discovery
- OpenAPI: `GET /openapi.json`
- `llms.txt`: `GET /llms.txt`
- Tool manifests: `GET /.well-known/ai-tool/<tool>.json`
- Health: `GET /health`
- Totals: `GET /api/totals`
- Status: `GET /status`
- Tool directory: `GET /tools`

## NFT
`GENESIS AGENTS — ORIGIN` — 111 supply, deterministic SVG, Base. Utility: 100 capped paid-tool credits. See `GET /nft`.

## Security & contact
- No private keys or seed material in this repository.
- Security policy: see `SECURITY.md`.
- Contact: `chitara.trading@proton.me`

## License
Source code of the tools is sold separately (GitBuyer/x402Git). This repository contains discovery/documentation only.
