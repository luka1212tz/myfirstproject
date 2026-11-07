import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHash } from 'node:crypto';
import { adminEmailMatches, setAdminCookie, verifyAdminPassword } from '../_lib/auth.js';
import { database } from '../_lib/db.js';
import { bodyObject, cleanText, isSameOriginRequest, json, methodNotAllowed } from '../_lib/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  if (!isSameOriginRequest(req)) return json(res, 403, { error: 'Invalid request origin.' });
  const body = bodyObject(req);
  const email = cleanText(body.email, 254);
  const password = String(body.password ?? '');

  try {
    const forwarded = String(req.headers['x-forwarded-for'] ?? req.socket?.remoteAddress ?? 'unknown');
    const clientAddress = forwarded.split(',')[0].trim().slice(0, 80);
    const rateKey = `admin:${createHash('sha256').update(clientAddress).digest('hex')}`;
    const sql = database();
    const attempts = await sql`
      INSERT INTO booking_rate_limits (key, window_started_at, request_count)
      VALUES (${rateKey}, now(), 1)
      ON CONFLICT (key) DO UPDATE SET
        request_count = CASE WHEN booking_rate_limits.window_started_at < now() - interval '10 minutes' THEN 1 ELSE booking_rate_limits.request_count + 1 END,
        window_started_at = CASE WHEN booking_rate_limits.window_started_at < now() - interval '10 minutes' THEN now() ELSE booking_rate_limits.window_started_at END
      RETURNING request_count`;
    if (Number(attempts[0]?.request_count) > 7) {
      return json(res, 429, { error: 'Too many sign-in attempts. Please try again in 10 minutes.' });
    }

    if (!adminEmailMatches(email) || !verifyAdminPassword(password)) {
      return json(res, 401, { error: 'Email or password is incorrect.' });
    }

    await sql`DELETE FROM booking_rate_limits WHERE key=${rateKey}`;
    setAdminCookie(res);
    return json(res, 200, { ok: true });
  } catch (error) {
    console.error('Admin login error:', error);
    return json(res, 500, { error: 'Admin sign-in is temporarily unavailable or not configured correctly.' });
  }
}
