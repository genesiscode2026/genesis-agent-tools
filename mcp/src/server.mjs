#!/usr/bin/env node
// GENESIS Agent Tools — thin buyer-side MCP adapter.
//
// Exposes the five GENESIS flagships as MCP tools over stdio (JSON-RPC).
// Payment is x402: the BUYER's key (X402_PRIVATE_KEY env) funds each call.
// GENESIS never receives the key except through the standard x402 client.
//
// Safety:
//   - per-call ceiling  GENESIS_MAX_SPEND_USD  (default 0.02)
//   - session budget    GENESIS_SESSION_BUDGET_USD (default 1.00)
//   - explicit prices in every tool description
//   - the private key is never logged
import readline from 'node:readline';
import { wrapFetchWithPaymentFromConfig } from '@x402/fetch';
import { ExactEvmScheme, toClientEvmSigner } from '@x402/evm';
import { privateKeyToAccount } from 'viem/accounts';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const ORIGIN = process.env.GENESIS_ORIGIN || 'https://genesis-agent-tools.genesisagenttools.workers.dev';
const BASE_RPC = process.env.GENESIS_RPC || 'https://mainnet.base.org';

const FLAGSHIPS = {
  release_guardian: {
    slug: 'release-guardian', price: { quick: 0.001, deep: 0.019 },
    description: 'Detect breaking API/OpenAPI/GraphQL/schema changes between two versions. Quick 0.001 USDC, deep 0.019 USDC.',
  },
  workflow_runner: {
    slug: 'workflow-runner', price: { quick: 0.005, deep: 0.035 },
    description: 'Run a bounded HTTP/JSON workflow (fetch, transform, validate, compare). Quick 0.005 USDC, deep 0.035 USDC.',
  },
  asset_intelligence: {
    slug: 'asset-intelligence', price: { quick: 0.005, deep: 0.025 },
    description: 'Verify a crypto asset live multi-source price, freshness and on-chain owner. Quick 0.005 USDC, deep 0.025 USDC.',
  },
  research_evidence: {
    slug: 'research-evidence', price: { quick: 0.005, deep: 0.040 },
    description: 'Extract cited claims and contradictions from supplied URLs. Quick 0.005 USDC, deep 0.040 USDC.',
  },
  agent_assurance: {
    slug: 'agent-assurance', price: { quick: 0.005, deep: 0.029 },
    description: 'Audit an agent or MCP server for readiness, observed risk and evidence. Quick 0.005 USDC, deep 0.029 USDC.',
  },
};

const TOOL_SCHEMAS = {
  release_guardian: {
    type: 'object',
    properties: {
      previous: { type: 'object', description: 'Baseline OpenAPI/GraphQL/schema JSON object' },
      current: { type: 'object', description: 'Proposed OpenAPI/GraphQL/schema JSON object' },
      tier: { type: 'string', enum: ['quick', 'deep'], default: 'quick', description: 'quick is cheaper; deep is higher-evidence' },
    },
    required: ['previous', 'current'],
  },
  workflow_runner: {
    type: 'object',
    properties: {
      steps: { type: 'array', items: { type: 'object' }, description: 'Bounded workflow steps (http_get, validate, compare, ...)' },
      tier: { type: 'string', enum: ['quick', 'deep'], default: 'quick' },
    },
    required: ['steps'],
  },
  asset_intelligence: {
    type: 'object',
    properties: {
      symbol: { type: 'string', description: 'Asset symbol (e.g. BTC)' },
      chain: { type: 'string', description: 'Optional chain id/name' },
      contract: { type: 'string', description: 'Optional contract address' },
      tier: { type: 'string', enum: ['quick', 'deep'], default: 'quick' },
    },
  },
  research_evidence: {
    type: 'object',
    properties: {
      urls: { type: 'array', items: { type: 'string' }, description: 'URLs to analyze' },
      tier: { type: 'string', enum: ['quick', 'deep'], default: 'quick' },
    },
    required: ['urls'],
  },
  agent_assurance: {
    type: 'object',
    properties: {
      tool: { type: 'object', description: 'Tool/manifest object' },
      card: { type: 'object', description: 'Agent card object' },
      instructions: { type: 'array', items: { type: 'string' } },
      text: { type: 'string' },
      tier: { type: 'string', enum: ['quick', 'deep'], default: 'quick' },
    },
  },
};

const TOOL_LIST = Object.entries(FLAGSHIPS).map(([key, f]) => ({
  name: 'genesis_' + key,
  description: f.description,
  inputSchema: TOOL_SCHEMAS[key],
}));

// ---- budget / ceiling state ----
const maxSpend = Number(process.env.GENESIS_MAX_SPEND_USD || '0.02');
const sessionBudget = Number(process.env.GENESIS_SESSION_BUDGET_USD || '1.00');
let sessionSpend = 0;
let paymentClient = null;

function getPaymentClient() {
  if (paymentClient) return paymentClient;
  const key = (process.env.X402_PRIVATE_KEY || '').trim();
  if (!key) throw new Error('X402_PRIVATE_KEY is not set — provide a Base USDC-funded buyer key');
  const account = privateKeyToAccount(key);
  const publicClient = createPublicClient({ chain: base, transport: http(BASE_RPC) });
  const signer = toClientEvmSigner(account, publicClient);
  const scheme = new ExactEvmScheme(signer);
  paymentClient = wrapFetchWithPaymentFromConfig(fetch, { schemes: [{ network: 'eip155:8453', client: scheme }] });
  return paymentClient;
}

async function callFlagship(key, args) {
  const f = FLAGSHIPS[key];
  const tier = args?.tier === 'deep' ? 'deep' : 'quick';
  const price = f.price[tier];
  if (price > maxSpend) throw new Error(`per-call price ${price} USDC exceeds ceiling ${maxSpend}`);
  if (sessionSpend + price > sessionBudget) throw new Error(`session budget exceeded (spent ${sessionSpend}, budget ${sessionBudget})`);

  let input;
  if (key === 'release_guardian') input = { previous: args.previous, current: args.current };
  else if (key === 'workflow_runner') input = { steps: args.steps ?? args };
  else if (key === 'asset_intelligence') input = { symbol: args.symbol, chain: args.chain, contract: args.contract };
  else if (key === 'research_evidence') input = { urls: args.urls };
  else input = { tool: args.tool, card: args.card, instructions: args.instructions, text: args.text };

  const client = getPaymentClient();
  const res = await client(ORIGIN + '/api/flagships/' + f.slug, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tier, input }),
  });
  if (res.status !== 200) throw new Error(`GENESIS ${f.slug} returned HTTP ${res.status}`);
  const out = await res.json();
  const paid = Number(out?.amount) || price;
  sessionSpend += paid;
  return out;
}

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

function toolResult(obj) {
  return { content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }], isError: false };
}
function toolError(msg) {
  return { content: [{ type: 'text', text: String(msg) }], isError: true };
}

async function handle(msg) {
  const { id, method, params } = msg || {};
  if (method === 'initialize') {
    send({ jsonrpc: '2.0', id, result: {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'genesis-agent-mcp', version: '1.0.0' },
    } });
    return;
  }
  if (method === 'notifications/initialized' || method === 'notifications/cancelled') return;
  if (method === 'ping') { send({ jsonrpc: '2.0', id, result: {} }); return; }
  if (method === 'tools/list') {
    send({ jsonrpc: '2.0', id, result: { tools: TOOL_LIST } });
    return;
  }
  if (method === 'tools/call') {
    const name = params?.name || '';
    const key = name.replace(/^genesis_/, '');
    if (!FLAGSHIPS[key]) { send({ jsonrpc: '2.0', id, result: toolError('unknown tool: ' + name) }); return; }
    try {
      const out = await callFlagship(key, params?.arguments || {});
      send({ jsonrpc: '2.0', id, result: toolResult(out) });
    } catch (e) {
      send({ jsonrpc: '2.0', id, result: toolError(e?.message || String(e)) });
    }
    return;
  }
  send({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found: ' + method } });
}

const rl = readline.createInterface({ input: process.stdin, terminal: false });
rl.on('line', (line) => {
  const t = line.trim();
  if (!t) return;
  let msg;
  try { msg = JSON.parse(t); } catch { return; }
  handle(msg).catch(() => {});
});

// Log nothing sensitive; a single startup line (no keys) for diagnostics.
console.error('genesis-agent-mcp ready (origin ' + ORIGIN + ', per-call ceiling ' + maxSpend + ' USDC, session budget ' + sessionBudget + ' USDC)');

