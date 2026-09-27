#!/usr/bin/env node
// GENESIS Release Guardian — npx CLI runner.
//
// Free mode (no payment):
//   npx genesis-release-guardian --prev openapi-v1.json --curr openapi-v2.json
//
// Paid mode (full SAFE/REVIEW/BLOCK verdict — 0.005 USDC on Base):
//   X402_PRIVATE_KEY=0x... npx genesis-release-guardian \
//     --prev openapi-v1.json --curr openapi-v2.json --pay
//
// Options:
//   --prev, --previous   Path to previous/base spec JSON
//   --curr, --current    Path to current spec JSON
//   --pay                Execute the paid verdict (requires X402_PRIVATE_KEY)
//   --mode               quick (default, 0.005 USDC) | deep (0.019 USDC)
//   --output             json | text (default: text)
//   --fail-on            breaking (default) | risky | never
//   --max-spend-usd      Hard ceiling in USDC (default: mode price)
//   --dry-run            Show challenge price, do not pay
//   --help               Show this help

import { readFileSync } from 'node:fs';

const ORIGIN = 'https://genesis-agent-tools.genesisagenttools.workers.dev';
const PREVIEW_ENDPOINT = ORIGIN + '/api/flagships/release-guardian/preview';
const PAID_ENDPOINT = ORIGIN + '/api/flagships/release-guardian';
const PREMIUM_PAGE = ORIGIN + '/premium#release-check';
const USDC_DECIMALS = 1e6;
const MODE_PRICE = { quick: 0.005, deep: 0.019 };

// ─── Argument parsing ────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const get = (flag, aliases = []) => {
  for (const f of [flag, ...aliases]) {
    const i = args.indexOf(f);
    if (i !== -1 && args[i + 1] && !args[i + 1].startsWith('--')) return args[i + 1];
  }
  return null;
};
const has = (flag) => args.includes(flag);

if (has('--help') || has('-h')) {
  console.log(`
GENESIS Release Guardian CLI — API Breaking Change Detector
===========================================================

Free preview (no payment, no wallet):
  npx genesis-release-guardian --prev openapi-v1.json --curr openapi-v2.json

Full paid verdict (0.005 USDC on Base, gasless EIP-3009):
  X402_PRIVATE_KEY=0x<key> npx genesis-release-guardian \\
    --prev openapi-v1.json --curr openapi-v2.json --pay

Options:
  --prev, --previous   Previous/base spec (JSON file path or inline JSON string)
  --curr, --current    Current spec (JSON file path or inline JSON string)
  --pay                Execute paid call (requires X402_PRIVATE_KEY env var)
  --mode               quick (0.005 USDC, default) | deep (0.019 USDC)
  --output             text (default) | json
  --fail-on            breaking (default) | risky | never
  --max-spend-usd      Hard spending ceiling (default: mode price)
  --dry-run            Show 402 challenge price without paying
  --help               Show this help

Pay & unlock full verdict: ${PREMIUM_PAGE}
`);
  process.exit(0);
}

function loadSpec(v, name) {
  if (!v) { console.error(`Error: ${name} is required (--prev or --curr)`); process.exit(1); }
  const raw = v.trim();
  if (raw.startsWith('{') || raw.startsWith('[')) {
    try { return JSON.parse(raw); } catch { console.error(`Error: ${name} is not valid JSON`); process.exit(1); }
  }
  try { return JSON.parse(readFileSync(raw, 'utf8')); }
  catch { console.error(`Error: cannot read or parse ${name} from "${raw}"`); process.exit(1); }
}

const prevRaw = get('--prev', ['--previous']);
const currRaw = get('--curr', ['--current']);
const mode    = (get('--mode') || 'quick').toLowerCase();
const doPay   = has('--pay');
const dryRun  = has('--dry-run');
const outputFmt = (get('--output') || 'text').toLowerCase();
const failOn  = (get('--fail-on') || 'breaking').toLowerCase();
const maxSpendArg = get('--max-spend-usd');

if (!['quick', 'deep'].includes(mode)) {
  console.error(`Error: --mode must be quick or deep`); process.exit(1);
}
if (!['breaking', 'risky', 'never'].includes(failOn)) {
  console.error(`Error: --fail-on must be breaking, risky, or never`); process.exit(1);
}

const previous = loadSpec(prevRaw, '--prev');
const current  = loadSpec(currRaw, '--curr');
const publishedPrice = MODE_PRICE[mode];
const maxSpend = maxSpendArg != null ? Number(maxSpendArg) : publishedPrice;

// ─── Free preview (always runs first) ────────────────────────────────────────
async function runPreview() {
  let j;
  try {
    const r = await fetch(PREVIEW_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ previous, current }),
    });
    j = await r.json();
  } catch (e) {
    console.error('Error: preview endpoint unreachable:', e.message);
    process.exit(1);
  }

  if (outputFmt === 'json') { console.log(JSON.stringify(j, null, 2)); return j; }

  const divider = '─'.repeat(60);
  console.log(`\n${divider}`);
  console.log('GENESIS Release Guardian — Free Scope Preview');
  console.log(divider);
  console.log(`Spec type   : ${j.spec_type || 'unknown'}`);
  console.log(`Input valid : ${j.input_valid ? 'Yes ✓' : 'No ✗'}`);
  console.log(`Comparable  : ${j.comparable ? 'Yes — changes detected' : 'No — identical or incomplete'}`);
  console.log(`Analyzed    : ${j.analyzed_count ?? 'N/A'} artifacts`);
  console.log(`Scope       : ${(j.scope || []).join(', ') || 'none'}`);
  if (j.limitation) console.log(`Scope note  : ${j.limitation}`);
  console.log(divider);
  console.log(`\n💡 Unlock the full SAFE/REVIEW/BLOCK verdict for ${publishedPrice} USDC on Base:`);
  console.log(`   ${PREMIUM_PAGE}`);
  console.log(`   OR run with --pay and X402_PRIVATE_KEY set.\n`);
  return j;
}

// ─── Paid call (--pay or X402_PRIVATE_KEY present with --pay) ────────────────
async function runPaid() {
  const privateKey = process.env.X402_PRIVATE_KEY;
  if (!privateKey && !dryRun) {
    console.error('Error: X402_PRIVATE_KEY env var required for paid calls (or use --dry-run)');
    process.exit(1);
  }
  if (privateKey) {
    // Dynamically import viem/x402 — only loaded when actually paying
    let wrapFetch, ExactEvmScheme, toClientEvmSigner, privateKeyToAccount, createPublicClient, http, base;
    try {
      ({ wrapFetchWithPaymentFromConfig: wrapFetch } = await import('@x402/fetch'));
      ({ ExactEvmScheme, toClientEvmSigner } = await import('@x402/evm'));
      ({ privateKeyToAccount } = await import('viem/accounts'));
      ({ createPublicClient, http } = await import('viem'));
      ({ base } = await import('viem/chains'));
    } catch {
      console.error('Error: @x402/fetch, @x402/evm, and viem are required for paid mode.');
      console.error('Install: npm i @x402/fetch @x402/evm viem');
      process.exit(1);
    }

    const body = JSON.stringify({ tier: mode, input: { previous, current } });

    // Pre-flight: read 402 challenge and enforce ceiling
    const probe = await fetch(PAID_ENDPOINT, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body,
    });
    if (probe.status !== 402) {
      console.error(`Error: expected 402 challenge, got HTTP ${probe.status}`); process.exit(1);
    }
    const prHeader = probe.headers.get('payment-required') || probe.headers.get('x402-payment-required');
    if (!prHeader) { console.error('Error: no PAYMENT-REQUIRED header in 402'); process.exit(1); }
    let challenge;
    try { challenge = JSON.parse(Buffer.from(prHeader, 'base64').toString('utf8')); }
    catch { console.error('Error: could not decode PAYMENT-REQUIRED header'); process.exit(1); }

    const amountUsd = Number(challenge?.accepts?.[0]?.amount) / USDC_DECIMALS;
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
      console.error('Error: no parseable USDC amount in challenge'); process.exit(1);
    }
    if (amountUsd > maxSpend) {
      console.error(`Error: quoted ${amountUsd} USDC exceeds --max-spend-usd ${maxSpend}; aborting`);
      process.exit(1);
    }
    if (amountUsd > publishedPrice) {
      console.error(`Error: quoted ${amountUsd} USDC exceeds published price ${publishedPrice} USDC; aborting`);
      process.exit(1);
    }
    console.log(`Pre-flight: quoted ${amountUsd} USDC — within ceiling ${maxSpend} USDC`);

    if (dryRun) {
      console.log(`DRY RUN: would pay ${amountUsd} USDC to Exodus Treasury on Base. Aborting before signing.`);
      process.exit(0);
    }

    const account = privateKeyToAccount(privateKey);
    const publicClient = createPublicClient({ chain: base, transport: http('https://mainnet.base.org') });
    const signer = toClientEvmSigner(account, publicClient);
    const scheme = new ExactEvmScheme(signer);
    const fetchWithPay = wrapFetch(fetch, { schemes: [{ network: 'eip155:8453', client: scheme }] });

    console.log('Signing EIP-3009 authorization and settling payment...');
    const res = await fetchWithPay(PAID_ENDPOINT, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body,
    });
    if (res.status !== 200) {
      console.error(`Error: release-guardian returned HTTP ${res.status} (check wallet funding and USDC balance)`);
      process.exit(1);
    }
    const out = await res.json();

    if (outputFmt === 'json') { console.log(JSON.stringify(out, null, 2)); }
    else {
      const verdict  = out?.result?.status || 'UNKNOWN';
      const severity = out?.result?.severity || 'NONE';
      const breaking = out?.result?.breaking_count ?? 0;
      const risk     = out?.result?.risk_count ?? 0;
      const txHash   = out?.settlement_tx_hash;

      const divider = '─'.repeat(60);
      console.log(`\n${divider}`);
      console.log('GENESIS Release Guardian — Full Paid Verdict');
      console.log(divider);
      console.log(`Verdict   : ${verdict}`);
      console.log(`Severity  : ${severity}`);
      console.log(`Breaking  : ${breaking}`);
      console.log(`Risk      : ${risk}`);
      if (txHash) console.log(`Settlement: https://basescan.org/tx/${txHash}`);
      console.log(divider);
      if (out?.result?.report) console.log('\n' + out.result.report);
    }

    const shouldFail = failOn === 'breaking'
      ? (out?.result?.status === 'BREAKING')
      : failOn === 'risky'
        ? ['BREAKING', 'RISKY'].includes(out?.result?.status)
        : false;
    if (shouldFail) {
      console.error(`\nRelease blocked by GENESIS Release Guardian: verdict ${out?.result?.status}`);
      process.exit(1);
    }
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────
await runPreview();
if (doPay || process.env.X402_PRIVATE_KEY) await runPaid();
