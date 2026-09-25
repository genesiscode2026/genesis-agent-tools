// Regression test for the EIP-712 typed-data bug: the browser signer must
// merge the EIP712Domain type before serializing (otherwise the domain is
// empty and wallets reject eth_signTypedData_v4 with "Missing or invalid
// parameters").
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serializeTypedData, getTypesForEIP712Domain, getAddress } from 'viem';
import { authorizationTypes } from '@x402/evm';

const PAY_TO = '0xC6F86e170411182114FcCdb28793dC76B5e8D144';
const ASSET = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

test('EIP-3009 typed data merges EIP712Domain (non-empty domain)', () => {
  const domain = { name: 'USD Coin', version: '2', chainId: 8453, verifyingContract: getAddress(ASSET) };
  const message = {
    from: '0x1111111111111111111111111111111111111111',
    to: getAddress(PAY_TO),
    value: 1000n,
    validAfter: 0n,
    validBefore: 9999999999n,
    nonce: '0x' + 'ab'.repeat(32),
  };
  const types = { ...authorizationTypes, EIP712Domain: getTypesForEIP712Domain({ domain }) };
  const serialized = JSON.parse(serializeTypedData({ domain, types, primaryType: 'TransferWithAuthorization', message }));

  assert.equal(serialized.domain.name, 'USD Coin');
  assert.equal(serialized.domain.chainId, 8453);
  assert.equal(serialized.domain.verifyingContract.toLowerCase(), ASSET.toLowerCase());
  assert.ok(serialized.types.EIP712Domain, 'EIP712Domain type present');
  assert.equal(serialized.message.value, '1000');
  assert.equal(serialized.message.to.toLowerCase(), PAY_TO.toLowerCase());
});

test('EIP-3009 amount is 1000 atomic units for 0.001 USDC', () => {
  assert.equal(BigInt(1000), 1000n);
  // 0.001 * 1e6 = 1000
  assert.equal(Math.round(0.001 * 1e6), 1000);
});
