# GENESIS Asset Intelligence — Pre-Trade Safety Guard for Base DeFi Bots

Stop your Base sniper or trading bot from buying honeypots, malicious proxy upgrades, or swapping at manipulated oracle prices on Aerodrome or Uniswap v3.

## Why Base Trading Bots Need This

1. **Honeypot & Rugpull Defense**: Attackers mint tokens with malicious ownership transfer or transfer-tax logic. GENESIS checks on-chain bytecode and contract ownership directly on Base.
2. **Multi-Source Price Consensus**: Detects price outliers and liquidity manipulation before executing high-slippage swaps.
3. **Zero Subscriptions or API Keys**: Pay only per check (0.005 USDC for quick consensus, 0.025 USDC for deep contract audit) via gasless EIP-3009 micropayments on Base.

---

## 3-Line Drop-In Check (Node.js / TypeScript)

```javascript
import { wrapFetchWithPayment } from '@x402/fetch';
import { privateKeyToAccount } from 'viem/accounts';

const botAccount = privateKeyToAccount(process.env.BASE_BOT_PRIVATE_KEY);
const fetchWithPay = wrapFetchWithPayment(fetch, botAccount);

// Pre-swap safety guard (0.005 USDC per check)
const res = await fetchWithPay('https://genesis-agent-tools.genesisagenttools.workers.dev/api/flagships/asset-intelligence', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tier: 'quick',
    input: { symbol: 'AERO', chain: 'base', contract: '0x940181a94A35A4569E4529A3CDfB74e38FD98631' }
  })
});
const intelligence = await res.json();

if (!intelligence.ok || intelligence.result.risk_level === 'HIGH') {
  console.warn('⛔ Pre-trade check flagged risk. Aborting swap:', intelligence);
  return;
}
// Proceed with swap...
```

---

## Python Integration (for Python Snipers)

```python
import os
import requests
from eth_account import Account
from eth_account.messages import encode_defunct

# Wrap request with EIP-3009 authorization when 402 is received
def check_asset_safety(symbol: str, contract: str, tier: str = "quick"):
    url = "https://genesis-agent-tools.genesisagenttools.workers.dev/api/flagships/asset-intelligence"
    payload = {"tier": tier, "input": {"symbol": symbol, "chain": "base", "contract": contract}}
    
    r = requests.post(url, json=payload)
    if r.status_code == 402:
        challenge = r.json()
        # Challenge details:
        # network: eip155:8453 (Base)
        # payTo: 0xC6F86e170411182114FcCdb28793dC76B5e8D144
        # amount: 5000 (0.005 USDC)
        return challenge
    return r.json()
```

---

## Service Tiers

| Tier | Price | Verification Surface |
|---|---|---|
| **Quick** | `0.005 USDC` | Multi-source price consensus, timestamp freshness, canonical identity |
| **Deep** | `0.025 USDC` | On-chain Base bytecode analysis, contract owner status, honeypot risk |

Payment settles via **x402 / EIP-3009** directly in USDC on Base (`eip155:8453`).
Treasury recipient: `0xC6F86e170411182114FcCdb28793dC76B5e8D144`
