#!/usr/bin/env node
/**
 * GENESIS Asset Intelligence — Pre-Trade DeFi Bot Guard
 * Demonstrates querying the GENESIS Asset Intelligence API on Base
 * for multi-source price consensus and contract verification.
 */

const ENDPOINT = 'https://genesis-agent-tools.genesisagenttools.workers.dev/api/flagships/asset-intelligence';

export async function checkAssetSafety({ symbol, contract, chain = 'base', tier = 'quick' }) {
  console.log(`🔍 Checking ${symbol} (${contract || 'native'}) on ${chain} [tier: ${tier}]...`);
  
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tier,
      input: { symbol, contract, chain }
    })
  });

  if (response.status === 402) {
    const challenge = await response.json();
    console.log(`💳 x402 Payment Challenge received:`);
    console.log(`   - Network: ${challenge.network} (Base Mainnet)`);
    console.log(`   - Price: ${challenge.amount_usdc} USDC`);
    console.log(`   - Pay To: ${challenge.payTo}`);
    console.log(`   - Product: ${challenge.genesis_product_id}`);
    return { status: 'PAYMENT_REQUIRED', challenge };
  }

  const result = await response.json();
  return { status: 'SUCCESS', result };
}

// CLI direct run
if (process.argv[1] && process.argv[1].endsWith('genesis-asset-guard.mjs')) {
  const symbol = process.argv[2] || 'AERO';
  const contract = process.argv[3] || '0x940181a94A35A4569E4529A3CDfB74e38FD98631';
  checkAssetSafety({ symbol, contract, tier: 'quick' })
    .then((res) => console.log('Result:', JSON.stringify(res, null, 2)))
    .catch((err) => console.error('Error:', err));
}
