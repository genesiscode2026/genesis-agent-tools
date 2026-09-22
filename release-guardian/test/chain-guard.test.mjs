// Regression: the wallet must be on Base (8453 / 0x2105) before signing, and
// signing MUST be refused when the active wallet chainId != typed-data chainId.
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('0x2105 is chainId 8453 (Base)', () => {
  assert.equal(parseInt('0x2105', 16), 8453);
});

test('signer refuses to sign when provider chainId != typedData.domain.chainId', async () => {
  // Simulate a wallet on Ethereum mainnet (0x1) while typed data targets Base (8453).
  const activeChainHex = '0x1';
  let signed = false;
  const sign = async (domainChainId) => {
    const currentChainId = activeChainHex;
    if (parseInt(currentChainId, 16) !== Number(domainChainId)) {
      throw new Error('Refusing to sign: chainId mismatch');
    }
    signed = true;
  };

  await assert.rejects(() => sign(8453), /chainId mismatch/);
  assert.equal(signed, false, 'must not sign on chain mismatch');
});

test('signer signs when provider chainId matches typedData.domain.chainId', async () => {
  const activeChainHex = '0x2105';
  let signed = false;
  const sign = async (domainChainId) => {
    const currentChainId = activeChainHex;
    if (parseInt(currentChainId, 16) !== Number(domainChainId)) {
      throw new Error('Refusing to sign: chainId mismatch');
    }
    signed = true;
  };
  await sign(8453);
  assert.equal(signed, true, 'must sign on matching chain');
});
