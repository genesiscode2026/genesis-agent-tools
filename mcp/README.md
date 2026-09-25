# GENESIS Agent Tools — MCP adapter (buyer-side)

A thin MCP server that exposes the five GENESIS pay-per-call x402 flagships as
tools. **Release Guardian** and **Workflow Runner** are the primary tools.

- **No account, no API key.** Payment is x402 (USDC on Base).
- **You own the payment key.** GENESIS never sees your key except through the
  standard x402 `PAYMENT-SIGNATURE` a client produces against the quoted amount.

## Tools

| Tool | What it does | Quick | Deep |
|---|---|---|---|
| `genesis_release_guardian` | Cross-contract release preflight for MCP/OpenAPI/GraphQL/schema changes | 0.001 | 0.019 |
| `genesis_workflow_runner` | Bounded HTTP/JSON workflow (fetch/transform/validate/compare) | 0.005 | 0.035 |
| `genesis_asset_intelligence` | Crypto price consensus + on-chain owner | 0.005 | 0.025 |
| `genesis_research_evidence` | URL claims + contradictions | 0.005 | 0.040 |
| `genesis_agent_assurance` | MCP/agent readiness + risk | 0.005 | 0.029 |

## Payment safety

- `X402_PRIVATE_KEY` — your Base USDC-funded EIP-3009 signing key (required).
- `GENESIS_MAX_SPEND_USD` — per-call ceiling (default `0.02`). A tool call is
  refused if its price exceeds this.
- `GENESIS_SESSION_BUDGET_USD` — session budget (default `1.00`). Cumulative
  spend is tracked in-memory and further paid calls are refused once the budget
  is reached.
- Every tool description states its price. There is no silent unlimited spend.
- The private key is never logged.

## Install (one command)

```bash
npx -y genesis-agent-mcp
```

If the package is not yet published to npm, run it from the repo instead:

```bash
git clone https://github.com/genesiscode2026/genesis-agent-tools.git
node genesis-agent-tools/mcp/src/server.mjs
```

## Configuration

Provide your key via `env` (use a secret manager, never commit it).

### Cline

```json
{
  "mcpServers": {
    "genesis": {
      "command": "npx",
      "args": ["-y", "genesis-agent-mcp"],
      "env": {
        "X402_PRIVATE_KEY": "0x…",
        "GENESIS_MAX_SPEND_USD": "0.02",
        "GENESIS_SESSION_BUDGET_USD": "1.00"
      }
    }
  }
}
```

### Claude Desktop / Claude Code

`claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "genesis": {
      "command": "npx",
      "args": ["-y", "genesis-agent-mcp"],
      "env": { "X402_PRIVATE_KEY": "0x…" }
    }
  }
}
```

### Cursor

`.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "genesis": {
      "command": "npx",
      "args": ["-y", "genesis-agent-mcp"],
      "env": { "X402_PRIVATE_KEY": "0x…" }
    }
  }
}
```

To run from a checkout (no npm publish), set `command` to the absolute `node`
path and `args` to `["/abs/path/genesis-agent-tools/mcp/src/server.mjs"]`.
