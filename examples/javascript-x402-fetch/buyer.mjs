// GENESIS x402 buyer example — replace only BUYER_PRIVATE_KEY (funded USDC on Base).
import { wrapFetchWithPaymentFromConfig } from '@x402/fetch';
import { ExactEvmScheme, toClientEvmSigner } from '@x402/evm';
import { privateKeyToAccount } from 'viem/accounts';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const PRIVATE_KEY = process.env.BUYER_PRIVATE_KEY; // 0x… (never hardcode)
if (!PRIVATE_KEY) throw new Error('set BUYER_PRIVATE_KEY to a Base USDC-funded key');

const account = privateKeyToAccount(PRIVATE_KEY);
const publicClient = createPublicClient({ chain: base, transport: http('https://mainnet.base.org') });
const signer = toClientEvmSigner(account, publicClient);
const scheme = new ExactEvmScheme(signer);

const fetchWithPay = wrapFetchWithPaymentFromConfig(fetch, {
  schemes: [{ network: 'eip155:8453', client: scheme }],
});

const res = await fetchWithPay(
  'https://genesis-agent-tools.genesisagenttools.workers.dev/api/flagships/asset-intelligence',
  { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tier: 'quick', input: { symbol: 'BTC' } }) },
);
console.log(res.status, await res.json());
