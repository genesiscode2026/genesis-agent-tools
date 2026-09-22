// Security regression tests for the GENESIS MCP adapter (source-scan + live handshake).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'src', 'server.mjs'), 'utf8');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

test('no shell execution primitives', () => {
  assert.ok(!/child_process/.test(src));
  assert.ok(!/execSync|exec\(|spawn\(|execFile/.test(src));
});

test('no hardcoded private keys or seed phrases', () => {
  assert.ok(!/0x[0-9a-fA-F]{64}/.test(src));
  assert.ok(!/(seed|mnemonic)\s*phrase/i.test(src));
});

test('private key is never logged', () => {
  assert.ok(!src.includes('console.log(key)'));
  assert.ok(!/(console\.log|console\.error)[^;\n]*X402_PRIVATE_KEY/.test(src));
});

test('per-call ceiling and session budget are enforced', () => {
  assert.match(src, /price\s*>\s*maxSpend/, 'per-call ceiling');
  assert.match(src, /sessionSpend\s*\+\s*price\s*>\s*sessionBudget/, 'session budget');
});

test('minimal dependency surface (no MCP SDK / express / zod)', () => {
  const deps = { ...pkg.dependencies };
  assert.ok(!Object.keys(deps).some((d) => d.startsWith('@modelcontextprotocol/') || d === 'express' || d === 'zod'));
});

test('handshake: initialize + tools/list over stdio', () => {
  const input = [
    '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"t","version":"1"}}}',
    '{"jsonrpc":"2.0","method":"notifications/initialized"}',
    '{"jsonrpc":"2.0","id":2,"method":"tools/list"}',
  ].join('\n') + '\n';
  const r = spawnSync('node', [join(root, 'src', 'server.mjs')], { input, encoding: 'utf8' });
  const lines = r.stdout.split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const init = lines.find((l) => l.id === 1);
  const list = lines.find((l) => l.id === 2);
  assert.equal(init.result.serverInfo.name, 'genesis-agent-mcp');
  const names = list.result.tools.map((t) => t.name);
  assert.ok(names.includes('genesis_release_guardian'));
  assert.ok(names.includes('genesis_workflow_runner'));
});
