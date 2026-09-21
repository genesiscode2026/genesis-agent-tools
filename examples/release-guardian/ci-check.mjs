// Release Guardian — CI compatibility gate (pay-per-call x402).
// Calls the live Release Guardian endpoint and exits with a machine-readable
// code so a CI pipeline can block a release on BREAKING/RISKY.
//
// Exit codes:
//   0  SAFE
//   1  BREAKING (removed endpoint/symbol/property/type)
//   2  RISKY (incompatibility detected, not a hard removal)
//   3  UNKNOWN / UNSUPPORTED / error / no engine matched
//   42 buyer wallet not configured (BUYER_PRIVATE_KEY unset)
//
// No secrets are hardcoded. The buyer key is read from the environment and is
// the only thing you must provide (a Base USDC-funded EIP-3009 signing key).

import { wrapFetchWithPaymentFromConfig } from '@x402/fetch';
import { ExactEvmScheme, toClientEvmSigner } from '@x402/evm';
import { privateKeyToAccount } from 'viem/accounts';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { readFileSync } from 'node:fs';

const ORIGIN = 'https://genesis-agent-tools.genesisagenttools.workers.dev';
const ENDPOINT = ORIGIN + '/api/flagships/release-guardian';

// Demo diff: current removes the /users/{id} endpoint → BREAKING.
const DEMO_PREVIOUS = { paths: { '/users': { get: {} }, '/users/{id}': { get: {} } } };
const DEMO_CURRENT = { paths: { '/users': { get: {} } } };

function load(name, fallback) {
  const file = process.env[name + '_FILE'];
  const inline = process.env[name];
  if (file) return JSON.parse(readFileSync(file, 'utf8'));
  if (inline) return JSON.parse(inline);
  return fallback;
}

const PRIVATE_KEY = process.env.BUYER_PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error('BUYER_PRIVATE_KEY not set. Provide a Base USDC-funded EIP-3009 signing key (never commit it).');
  process.exit(42);
}

const previous = load('PREVIOUS', DEMO_PREVIOUS);
const current = load('CURRENT', DEMO_CURRENT);

const account = privateKeyToAccount(PRIVATE_KEY);
const publicClient = createPublicClient({ chain: base, transport: http('https://mainnet.base.org') });
const signer = toClientEvmSigner(account, publicClient);
const scheme = new ExactEvmScheme(signer);

// The x402 client transparently handles the HTTP 402 challenge: it signs the
// quoted USDC authorization and retries with the PAYMENT-SIGNATURE header.
const fetchWithPay = wrapFetchWithPaymentFromConfig(fetch, {
  schemes: [{ network: 'eip155:8453', client: scheme }],
});

const res = await fetchWithPay(ENDPOINT, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ tier: 'quick', input: { previous, current } }),
});

if (res.status !== 200) {
  console.error('release-guardian http ' + res.status);
  process.exit(3);
}

const body = await res.json();
const status = body?.result?.status;
console.log(JSON.stringify({ status, severity: body?.result?.severity, breaking_count: body?.result?.breaking_count, risk_count: body?.result?.risk_count, affected_surfaces: body?.result?.affected_surfaces }, null, 2));

if (status === 'BREAKING') process.exit(1);
if (status === 'RISKY') process.exit(2);
if (status === 'SAFE') process.exit(0);
process.exit(3); // UNKNOWN / UNSUPPORTED / abstained
