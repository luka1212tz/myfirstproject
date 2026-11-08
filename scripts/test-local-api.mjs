import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';

for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match) process.env[match[1]] = match[2];
}

const baseUrl = process.env.LOCAL_API_URL || 'http://127.0.0.1:3010';
const secret = process.env.ADMIN_SESSION_SECRET;
if (!secret) throw new Error('ADMIN_SESSION_SECRET is missing from .env.');

const expires = String(Math.floor(Date.now() / 1000) + 60);
const signature = createHmac('sha256', secret).update(expires).digest('hex');
const cookie = `shxap_admin=${encodeURIComponent(`${expires}.${signature}`)}`;
const ownerHeaders = { Cookie: cookie, Origin: baseUrl };

async function expect(path, expectedStatus, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  if (response.status !== expectedStatus) {
    throw new Error(`${path}: expected ${expectedStatus}, received ${response.status}: ${await response.text()}`);
  }
  return response;
}

await expect('/api/site', 200);
await expect('/api/admin', 401);
await expect('/api/availability?date=invalid&serviceId=invalid', 400);
await expect('/api/bookings', 400, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
await expect('/api/admin', 200, { headers: ownerHeaders });
await expect('/api/admin', 403, {
  method: 'POST',
  headers: { Cookie: cookie, 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'unknown' }),
});
await expect('/api/admin', 400, {
  method: 'POST',
  headers: { ...ownerHeaders, 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'unknown' }),
});

console.log('Public booking validation and protected admin API checks passed.');
