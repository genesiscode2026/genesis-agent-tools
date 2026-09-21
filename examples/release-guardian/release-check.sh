#!/usr/bin/env bash
# Release Guardian — generic shell CI gate.
# Wraps ci-check.mjs so any shell CI (GitLab, Jenkins, Drone, local) can block a
# release on BREAKING/RISKY. Handles the 402 payment step via the stock x402
# client (no secrets in this file; key comes from the environment).
set -euo pipefail

if [[ -z "${BUYER_PRIVATE_KEY:-}" ]]; then
  echo "release-guardian: BUYER_PRIVATE_KEY not set (Base USDC-funded EIP-3009 signing key)."
  echo "Without a funded wallet the call stops at HTTP 402 (payment required)."
  exit 42
fi

# Optional: point at real spec files, otherwise the demo diff is used.
# export PREVIOUS_FILE=specs/v1.json
# export CURRENT_FILE=specs/v2.json

node ci-check.mjs
code=$?

case "$code" in
  0) echo "release-guardian: SAFE — compatible";;
  1) echo "release-guardian: BREAKING — release blocked";;
  2) echo "release-guardian: RISKY — review before release";;
  3) echo "release-guardian: UNKNOWN/UNSUPPORTED — no engine matched input";;
  42) echo "release-guardian: payment not configured";;
  *) echo "release-guardian: unexpected exit $code";;
esac

exit "$code"
