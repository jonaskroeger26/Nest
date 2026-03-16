/**
 * Run in browser console on a page that has /api/solana-rpc (e.g. Nest app).
 * Fetches the kids-vault program account and checks if it's deployed.
 * Note: The program executable binary rarely contains instruction names as
 * plain ASCII; Anchor stores discriminators (hashes), so string-scanning
 * often returns nothing. This script verifies the account exists and lists
 * the instruction names the frontend expects.
 */

const PROGRAM_ID = '67KYfnCHNioKkcwWrgJ7N17wCyJjf2VaGtTVd1gtpQAX';
const EXPECTED_INSTRUCTIONS = ['create_vault', 'withdraw', 'create_token_vault', 'withdraw_token'];

async function check() {
  const rpcRes = await fetch('/api/solana-rpc');
  const { url, error } = await rpcRes.json();
  if (error || !url) {
    console.error('RPC error:', error || 'no url');
    return;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getAccountInfo',
      params: [PROGRAM_ID, { encoding: 'base64' }],
    }),
  });
  const data = await res.json();

  if (data.error) {
    console.error('getAccountInfo error:', data.error);
    return;
  }

  const acc = data.result?.value;
  if (!acc) {
    console.log('Account not found (not deployed or wrong cluster).');
    return;
  }

  const raw = acc.data;
  const b64 = Array.isArray(raw) ? raw[0] : raw;
  if (!b64) {
    console.log('No program data.');
    return;
  }

  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  console.log('Program account: executable =', acc.executable, '| data length =', bytes.length);

  // Optional: scan for instruction-like strings (often empty in deployed binaries)
  const text = new TextDecoder('latin1').decode(bytes);
  const matches = [...text.matchAll(/[a-z][a-z_]{4,30}/g)]
    .map((m) => m[0])
    .filter((s) => s.includes('_') || s.length > 8)
    .filter((v, i, a) => a.indexOf(v) === i);
  if (matches.length) {
    console.log('Possible instruction-like strings in binary:', matches.slice(0, 20));
  } else {
    console.log('No instruction-like strings in binary (normal for Anchor programs).');
  }

  console.log('Instructions the Nest frontend expects:', EXPECTED_INSTRUCTIONS.join(', '));
}

check();
