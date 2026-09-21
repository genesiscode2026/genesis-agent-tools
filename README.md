# GENESIS Agent Tools

Pay-per-call AI-agent APIs on **Base USDC (x402 v2)**. No account, no API key, no
subscription. Every paid endpoint returns HTTP `402` with the payment challenge;
sign the quoted USDC amount to the canonical Exodus treasury and retry to receive
the premium result.

**Live origin:** `https://genesis-agent-tools.genesisagenttools.workers.dev`

## What can I buy? (5 flagships)

| Flagship | What it does (buyer intent) | Endpoint | Quick | Deep |
|---|---|---|---|---|
| **Asset Intelligence** | Verify a crypto asset's live multi-source price, freshness, and on-chain owner before a trade. | `POST /api/flagships/asset-intelligence` | 0.005 | 0.025 |
| **Research & Evidence** | Extract cited claims and contradictions from supplied URLs into a bounded evidence synthesis. | `POST /api/flagships/research-evidence` | 0.005 | 0.040 |
| **Workflow Runner** | Validate or run a bounded HTTP/JSON workflow with a deterministic trace and durable checkpoints. | `POST /api/flagships/workflow-runner` | 0.005 | 0.035 |
| **Release Guardian** | Detect breaking API/OpenAPI/schema changes and release risk between two versions. | `POST /api/flagships/release-guardian` | 0.005 | 0.019 |
| **Agent Assurance** | Audit an agent or MCP server for readiness, observed risk, and evidence. | `POST /api/flagships/agent-assurance` | 0.005 | 0.029 |

All prices in **USDC**. All Quick products are ≤ $0.005 (Agent402 `execute` tier);
all Deep products are ≤ $0.040 (Agent402 `execute-plus` tier).

## How do I call it? (curl)

```bash
curl -X POST https://genesis-agent-tools.genesisagenttools.workers.dev/api/flagships/asset-intelligence \
  -H 'content-type: application/json' \
  -d '{"tier":"quick","input":{"symbol":"BTC"}}'
# → HTTP 402 with a base64 PAYMENT-REQUIRED header (payTo/asset/network/amount)
```

## How do I pay? (x402 v2)

- Network: **Base** (`eip155:8453`)
- Asset: **USDC** (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`)
- Recipient: **Exodus treasury** `0xC6F86e170411182114FcCdb28793dC76B5e8D144` (non-custodial)
- Scheme: `exact` (EIP-3009), fallback facilitator: Dexter (Permit2)

An x402 client decodes the 402, signs the EIP-3009 USDC authorization, and retries
with the `PAYMENT-SIGNATURE` header. See `examples/` for runnable curl + JavaScript
(`@x402/fetch`) buyers — replace only the funded buyer key.

## Machine discovery

- Agent402 index: registered origin `genesis-agent-tools.genesisagenttools.workers.dev`
  (find it via `GET https://agent402.tools/api/route?q=<task>`)
- OpenAPI: `GET /openapi.json` · x402 manifest: `GET /.well-known/x402`
- Machine catalog: `GET /api/flagships` · `llms.txt`: `GET /llms.txt` · Health: `GET /health`

## Also available (secondary)

- **Source-code products** (55 saleable): API-contract detectors, agent-security SDKs,
  quant-research suites, financial-visualization and privacy tooling — sold under a
  non-exclusive GENESIS license. Catalog: `/catalog.json` · `/catalog.md`.
- **Compatibility APIs** (6 paid + 1 free): `POST /api/mcp-schema-drift`, `POST /api/openapi-breaking-change`,
  `POST /api/sdk-compatibility`, `POST /api/compatibility-suite`, `POST /api/batch-compatibility-audit`,
  `POST /api/release-readiness`, free `POST /api/preflight`.
- **NFT access tiers**: `GENESIS AGENTS — ORIGIN` (ERC-721) + `GENESIS PASSES` (ERC-1155). `GET /nft`.

## Security

No private keys or seed material in this repository. GENESIS never holds buyer
funds and never requests private keys. Report issues via GitHub Issues. See `SECURITY.md`.

## License

Discovery/documentation only. Proprietary source is sold separately under a
non-exclusive GENESIS license.


