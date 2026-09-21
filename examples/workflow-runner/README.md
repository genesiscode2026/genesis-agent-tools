# Workflow Runner — bounded HTTP/JSON workflow execution over x402

**Workflow Runner executes bounded HTTP/JSON workflows with validation and
recovery over x402.** No account, no API key, no subscription.

| | |
|---|---|
| Live endpoint | `POST https://genesis-agent-tools.genesisagenttools.workers.dev/api/flagships/workflow-runner` |
| Quick price | **$0.005 USDC** (validate a workflow definition) |
| Deep price | $0.035 USDC (validate + run) |
| Network / asset | Base (`eip155:8453`) / USDC |
| Payment | x402 v2 (EIP-3009), non-custodial |
| Input | `{ "tier": "quick", "input": { "steps": […] } }` |

## What it is (and is not)

It is a **bounded** workflow runtime. V1 primitives are controlled and explicit:
`literal`, `hash`, `compare`, `extract`, `wait`, `branch`, `http_get`,
`http_post`. HTTP is restricted to allowlisted public hosts; there is **no
arbitrary shell, code, filesystem, private-network pivoting, or credential
automation**. It is not a general-purpose automation sandbox.

## 1. Validate a workflow (Quick — $0.005)

```bash
curl -sS -D - -X POST \
  https://genesis-agent-tools.genesisagenttools.workers.dev/api/flagships/workflow-runner \
  -H 'content-type: application/json' \
  -d '{"tier":"quick","input":{"steps":[{"op":"literal","value":1},{"op":"compare","a":1,"b":1,"cmp":"eq"}]}}'
```

Unpaid → HTTP `402` with the challenge. `tier:"quick"` returns
`result.valid` plus any `result.errors` for the step list; it does not execute.

## 2. Run a bounded workflow (Deep — $0.035)

`tier:"deep"` validates then executes. The result carries `result`,
`trace` (per-step ok/error and timing), `receipts`, `step_count`, and a
`replay_id` so the run is reproducible.

```json
{
  "tier": "deep",
  "input": {
    "steps": [
      { "op": "http_get", "url": "https://api.github.com/repos/octocat/Hello-World" },
      { "op": "extract", "input": null, "path": "full_name" },
      { "op": "compare", "a": null, "b": "octocat/Hello-World", "cmp": "eq" }
    ]
  }
}
```

### Step primitives

| op | purpose |
|---|---|
| `literal` | return a constant value |
| `hash` | SHA-256 of a string |
| `compare` | `a` vs `b` with `cmp` in `eq/neq/gt/lt` |
| `extract` | dot-path field extraction from an object |
| `wait` | bounded wait (capped) |
| `branch` | `condition` → `then` / `else` |
| `http_get` / `http_post` | allowlisted public HTTPS hosts only |

Limits are enforced (max steps, branch depth, per-step timeout, total duration).
A malformed or disallowed workflow returns `ok:false` with the specific error in
`warnings`, never a fabricated result.

## 3. Pay

Same flow as every flagship: the 402 challenge is signed with a stock x402
client (e.g. `@x402/fetch` + `@x402/evm`) to the Exodus treasury and retried.
The buyer wallet must be a separately provisioned Base USDC-funded key — GENESIS
never holds funds or requests keys.
