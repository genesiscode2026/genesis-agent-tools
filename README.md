# GENESIS Agent Tools

Pay-per-call AI-agent APIs on **Base USDC (x402 v2)**. No account, no API key, no
subscription. Every paid endpoint returns HTTP `402` with the payment challenge;
sign the quoted USDC amount to the canonical Exodus treasury and retry to receive
the premium result.

**Live origin:** `https://genesis-agent-tools.genesisagenttools.workers.dev`

## Release Guardian (primary)

**Pay-per-call x402 API that checks API/schema changes for breaking compatibility
before release.**

- **Endpoint:** `POST /api/flagships/release-guardian`
- **Input:** `{ "tier": "quick", "input": { "previous": …, "current": … } }`
- **Output:** `SAFE` / `RISKY` / `BREAKING` / `UNKNOWN` / `UNSUPPORTED`
- **Price:** Quick **$0.005** · Deep $0.019 (USDC)
- **Network:** Base (`eip155:8453`) · USDC · non-custodial (EIP-3009)

```bash
curl -sS -D - -X POST \
  https://genesis-agent-tools.genesisagenttools.workers.dev/api/flagships/release-guardian \
  -H 'content-type: application/json' \
  -d '{"tier":"quick","input":{"previous":{"paths":{"/users":{},"/users/{id}":{}}},"current":{"paths":{"/users":{}}}}}'
# → HTTP 402 with a base64 PAYMENT-REQUIRED header; sign & retry to get SAFE/RISKY/BREAKING
```

Runnable CI examples (GitHub Actions, shell, JS): [`examples/release-guardian/`](examples/release-guardian).

## Other flagships

| Flagship | What it does (buyer intent) | Endpoint | Quick | Deep |
|---|---|---|---|---|
| **Workflow Runner** | Validate or run a bounded HTTP/JSON workflow with a deterministic trace. | `POST /api/flagships/workflow-runner` | 0.005 | 0.035 |
| **Asset Intelligence** | Verify a crypto asset's live multi-source price, freshness, and on-chain owner. | `POST /api/flagships/asset-intelligence` | 0.005 | 0.025 |
| **Research & Evidence** | Extract cited claims and contradictions from supplied URLs. | `POST /api/flagships/research-evidence` | 0.005 | 0.040 |
| **Agent Assurance** | Audit an agent or MCP server for readiness, observed risk, and evidence. | `POST /api/flagships/agent-assurance` | 0.005 | 0.029 |

All prices in **USDC**. All Quick ≤ $0.005 (Agent402 `execute`); all Deep ≤ $0.040
(`execute-plus`). Bounded workflow example: [`examples/workflow-runner/`](examples/workflow-runner).

## How do I pay? (x402 v2)

- Network: **Base** (`eip155:8453`)
- Asset: **USDC** (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`)
- Recipient: **Exodus treasury** `0xC6F86e170411182114FcCdb28793dC76B5e8D144` (non-custodial)
- Scheme: `exact` (EIP-3009), fallback facilitator: Dexter (Permit2)

An x402 client decodes the 402, signs the EIP-3009 USDC authorization, and retries
with the `PAYMENT-SIGNATURE` header. See `examples/` for runnable curl + JavaScript
(`@x402/fetch`) buyers — replace only the funded buyer key.

The Agent402 50-settlement gate affects Agent402 **auto-dispatch only**; direct
x402 buyers (these examples) can purchase without Agent402 routing.

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


