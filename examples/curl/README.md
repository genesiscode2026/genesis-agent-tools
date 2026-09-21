# GENESIS x402 — curl example (unpaid 402 challenge)

Shows the exact payment terms before paying. No key, no spend.

```bash
curl -sS -D - -X POST \
  https://genesis-agent-tools.genesisagenttools.workers.dev/api/flagships/asset-intelligence \
  -H 'content-type: application/json' \
  -d '{"tier":"quick","input":{"symbol":"BTC"}}'
```

The response is HTTP `402` with a base64 `PAYMENT-REQUIRED` header containing
`network` (Base `eip155:8453`), `asset` (USDC), `payTo` (Exodus treasury), and
`amount` (USDC atomic). An x402 client signs and retries with `PAYMENT-SIGNATURE`.
