#!/usr/bin/env python3
"""
GENESIS Asset Intelligence — Pre-Trade DeFi Bot Guard (Python)
Checks token price consensus and contract verification on Base before swapping.
"""

import sys
import json
import urllib.request
import urllib.error

ENDPOINT = "https://genesis-agent-tools.genesisagenttools.workers.dev/api/flagships/asset-intelligence"

def check_asset_safety(symbol="AERO", contract="0x940181a94A35A4569E4529A3CDfB74e38FD98631", chain="base", tier="quick"):
    payload = json.dumps({
        "tier": tier,
        "input": {
            "symbol": symbol,
            "contract": contract,
            "chain": chain
        }
    }).encode("utf-8")

    req = urllib.request.Request(
        ENDPOINT,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "GENESIS-Asset-Guard/1.0"
        }
    )

    try:
        with urllib.request.urlopen(req) as resp:
            return {"status": "SUCCESS", "data": json.loads(resp.read().decode())}
    except urllib.error.HTTPError as e:
        if e.code == 402:
            body = json.loads(e.read().decode())
            return {
                "status": "PAYMENT_REQUIRED",
                "network": body.get("network"),
                "price_usdc": body.get("amount_usdc"),
                "pay_to": body.get("payTo"),
                "challenge": body
            }
        return {"status": "ERROR", "code": e.code, "message": str(e)}

if __name__ == "__main__":
    sym = sys.argv[1] if len(sys.argv) > 1 else "AERO"
    addr = sys.argv[2] if len(sys.argv) > 2 else "0x940181a94A35A4569E4529A3CDfB74e38FD98631"
    print(f"Checking asset safety for {sym} ({addr})...")
    res = check_asset_safety(sym, addr)
    print(json.dumps(res, indent=2))
