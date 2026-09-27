// Security regression tests for the GENESIS Release Guardian GitHub Action + CLI.
// These are source-scan invariants (no network, no keys) — they assert the
// action never exposes buyer credentials, never executes shell code, and never
// ships an unsafe dependency graph.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'src', 'index.js'), 'utf8');
const cli = readFileSync(join(root, 'src', 'cli.mjs'), 'utf8');
const action = readFileSync(join(root, 'action.yml'), 'utf8');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

test('action uses node20 runtime and requires buyer private-key input', () => {
  assert.match(action, /using:\s*'?node20'?/);
  assert.match(action, /private-key:/);
  assert.match(action, /required:\s*true/);
});

test('no shell execution primitives are used', () => {
  assert.ok(!/child_process/.test(src), 'no child_process import in action');
  assert.ok(!/execSync|exec\(|spawn\(|execFile/.test(src), 'no exec/spawn calls in action');
  assert.ok(!/child_process/.test(cli), 'no child_process import in CLI');
  assert.ok(!/execSync|exec\(|spawn\(|execFile/.test(cli), 'no exec/spawn calls in CLI');
});

test('no hardcoded private keys or seed phrases', () => {
  assert.ok(!/0x[0-9a-fA-F]{64}/.test(src), 'no 64-hex private key literal in action');
  assert.ok(!/0x[0-9a-fA-F]{64}/.test(cli), 'no 64-hex private key literal in CLI');
  assert.ok(!/(seed|mnemonic)\s*phrase/i.test(src), 'no seed phrase in action');
  assert.ok(!/(seed|mnemonic)\s*phrase/i.test(cli), 'no seed phrase in CLI');
});

test('buyer key is masked and never interpolated into logs', () => {
  assert.ok(src.includes('mask(privateKey)'), 'mask() is invoked with the key');
  assert.ok(!src.includes('console.log(privateKey)'), 'private key is never printed directly');
  // The key must never be embedded in a log/error/warning string.
  assert.ok(!/(console\.log|::error::|::warning::)[^;\n]*privateKey/.test(src), 'key never interpolated into logs');
});

test('spending ceiling is enforced against the live challenge amount', () => {
  assert.match(src, /amountUsd\s*>\s*maxSpend/, 'ceiling check present in action');
  assert.match(src, /aborting before payment/, 'aborts before signing in action');
  assert.match(cli, /amountUsd\s*>\s*maxSpend/, 'ceiling check present in CLI');
  assert.match(cli, /aborting/, 'aborts before signing in CLI');
});

test('published prices and the default ceiling match the live acquisition offer', () => {
  assert.match(src, /quick:\s*0\.005/);
  assert.match(src, /deep:\s*0\.019/);
  assert.match(action, /default:\s*'0\.005'/);
  assert.match(src, /amountUsd\s*>\s*publishedPrice/);
  assert.match(cli, /quick:\s*0\.005/);
  assert.match(cli, /deep:\s*0\.019/);
});

test('no @actions/* dependency (avoids vulnerable undici chain)', () => {
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  assert.ok(!Object.keys(deps).some((d) => d.startsWith('@actions/')), 'no @actions/* deps');
});

test('action does not instruct pull_request_target anywhere', () => {
  assert.ok(!/pull_request_target/.test(action), 'no pull_request_target');
});

test('package has bin entry for npx genesis-release-guardian', () => {
  assert.ok(pkg.bin, 'package.json has bin field');
  assert.ok(pkg.bin['genesis-release-guardian'], 'genesis-release-guardian bin entry exists');
  assert.match(pkg.bin['genesis-release-guardian'], /cli\.mjs/, 'bin points to cli.mjs');
});

test('package is correctly named for npm publication', () => {
  assert.equal(pkg.name, 'genesis-release-guardian', 'package name matches npx command');
  assert.ok(!pkg.private, 'package is not private (publishable)');
  assert.equal(pkg.type, 'module', 'ESM module');
});

test('smithery.yaml exists in repo root for Smithery.ai indexing', () => {
  const smitheryPath = join(root, '..', 'smithery.yaml');
  assert.ok(existsSync(smitheryPath), 'smithery.yaml exists in distribution root');
  const content = readFileSync(smitheryPath, 'utf8');
  assert.ok(content.includes('startCommand'), 'smithery.yaml has startCommand');
  assert.ok(content.includes('configSchema'), 'smithery.yaml has configSchema');
  assert.ok(content.includes('X402_PRIVATE_KEY'), 'smithery.yaml documents X402_PRIVATE_KEY');
  assert.ok(content.includes('commandFunction'), 'smithery.yaml has commandFunction');
});
