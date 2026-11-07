import type { VercelRequest, VercelResponse } from '@vercel/node';
import { clearAdminCookie } from '../_lib/auth.js';
import { isSameOriginRequest, json, methodNotAllowed } from '../_lib/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  if (!isSameOriginRequest(req)) return json(res, 403, { error: 'Invalid request origin.' });
  clearAdminCookie(res);
  return json(res, 200, { ok: true });
}
