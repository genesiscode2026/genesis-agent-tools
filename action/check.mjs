// GENESIS Release Guardian — free preview check (no wallet, no payment).
// Reads two JSON specs, calls the free preview endpoint, writes a GitHub job
// summary with a rich freemium hook and a direct 1-click payment link.
import { readFileSync, appendFileSync } from 'node:fs';

const ORIGIN = 'https://genesis-agent-tools.genesisagenttools.workers.dev';
const PREVIEW = ORIGIN + '/api/flagships/release-guardian/preview';
const PREMIUM_PAGE = ORIGIN + '/premium#release-check';

function load(p) {
  const raw = (p || '').trim();
  if (!raw) return {};
  try {
    if (raw.startsWith('{') || raw.startsWith('[')) return JSON.parse(raw);
    return JSON.parse(readFileSync(raw, 'utf8'));
  } catch { return { raw }; }
}

const previous = load(process.env.INPUT_PREVIOUS_SPEC || '');
const current  = load(process.env.INPUT_CURRENT_SPEC  || '');

let j;
try {
  const r = await fetch(PREVIEW, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ previous, current }),
  });
  j = await r.json();
} catch (e) {
  j = { input_valid: false, spec_type: 'unknown', limitation: 'Preview unavailable: ' + e.message };
}

const analyzedCount = j.analyzed_count ?? 'N/A';
const scope = (j.scope || []).join(', ') || 'none';
const limitation = j.limitation || '';
const comparable = j.comparable ?? 'unknown';

// Detect high-risk signals from preview (public info only, no verdict leaked)
const hasHighRisk = limitation && /breaking|critical|removed|BLOCK/i.test(limitation);
const riskEmoji  = hasHighRisk ? '🔴' : (comparable ? '🟡' : '⚪');
const riskLabel  = hasHighRisk ? 'High-risk signals detected in scope' : (comparable ? 'Changes detected — verdict requires payment' : 'Scope parsed, no changes detected');

const ctaPrice = '0.001 USDC';
const ctaLabel = `🔓 Unlock Full SAFE/REVIEW/BLOCK Verdict for ${ctaPrice} on Base`;
const ctaUrl   = `${PREMIUM_PAGE}?sku=GEN-SVC-0210`;

const summary = `## GENESIS Release Guardian — Free Scope Preview

| Field | Value |
|---|---|
| **Input valid** | ${j.input_valid ? '✅ Yes' : '❌ No'} |
| **Spec type** | \`${j.spec_type || 'unknown'}\` |
| **Comparable** | ${comparable ? '✅ Yes' : '⚠️ No (identical or incomplete)'} |
| **Analyzed artifacts** | ${analyzedCount} |
| **Scope** | ${scope || '—'} |
| **Preview signal** | ${riskEmoji} ${riskLabel} |

${limitation ? `> ℹ️ **Scope note:** ${limitation}\n\n` : ''}---

### ${hasHighRisk ? '⚠️ Potential Breaking Changes Detected' : '📋 Changes Are In Scope'}

${hasHighRisk
  ? `This free preview has detected signals that **may indicate breaking changes**. The full verdict (SAFE / REVIEW / BLOCK) with complete finding list, severity classification, remediation plan, and a signed cryptographic evidence report is available for \`${ctaPrice}\` on Base.\n\n**No account, no API key, no subscription required. Pay with any MetaMask / Coinbase Wallet.**`
  : `The full SAFE / REVIEW / BLOCK verdict with evidence report is available for \`${ctaPrice}\` on Base.`}

### [${ctaLabel}](${ctaUrl})

\`\`\`
Endpoint: POST ${ORIGIN}/api/premium/release-risk/check
Payment:  ${ctaPrice} USDC on Base (EIP-3009 gasless authorization)
Output:   Machine JSON + Executive Markdown report, delivered immediately
\`\`\`

<details>
<summary>🤖 Use directly in CI (with your USDC wallet on Base)</summary>

\`\`\`yaml
# .github/workflows/release-guard.yml
uses: genesiscode2026/genesis-agent-tools/release-guardian@v1
with:
  previous-spec: openapi-v1.json
  current-spec:  openapi-v2.json
  private-key:   \${{ secrets.X402_PRIVATE_KEY }}   # Base wallet with USDC
  fail-on:       breaking
\`\`\`

Or with the CLI runner (no wallet needed for the free preview):
\`\`\`bash
npx genesis-release-guardian --prev openapi-v1.json --curr openapi-v2.json
\`\`\`

</details>
`;

process.stdout.write(summary + '\n');

const out = process.env.GITHUB_STEP_SUMMARY;
if (out) appendFileSync(out, summary);

// Set outputs for downstream workflow steps
const outputFile = process.env.GITHUB_OUTPUT;
if (outputFile) {
  appendFileSync(outputFile, `input_valid=${j.input_valid}\n`);
  appendFileSync(outputFile, `spec_type=${j.spec_type || 'unknown'}\n`);
  appendFileSync(outputFile, `comparable=${comparable}\n`);
  appendFileSync(outputFile, `analyzed_count=${analyzedCount}\n`);
  appendFileSync(outputFile, `has_high_risk=${hasHighRisk}\n`);
  appendFileSync(outputFile, `payment_url=${ctaUrl}\n`);
}
