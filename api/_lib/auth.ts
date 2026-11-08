import { createHmac, scryptSync, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'shxap_admin';
const SESSION_SECONDS = 60 * 60 * 8;

function getCookie(req: any, name: string): string {
  const raw = String(req.headers?.cookie ?? '');
  for (const piece of raw.split(';')) {
    const [key, ...value] = piece.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return '';
}

function sign(payload: string): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('ADMIN_SESSION_SECRET must contain at least 32 characters.');
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export function setAdminCookie(res: any) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = String(expires);
  const token = `${payload}.${sign(payload)}`;
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${SESSION_SECONDS}${secure}`);
}

export function clearAdminCookie(res: any) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0${secure}`);
}

export function isAdmin(req: any): boolean {
  try {
    const token = getCookie(req, COOKIE_NAME);
    const [expires, signature] = token.split('.');
    if (!expires || !signature || Number(expires) < Math.floor(Date.now() / 1000)) return false;
    const expected = sign(expires);
    const providedBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

export function verifyAdminPassword(candidate: string): boolean {
  const expectedEmail = String(process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
  const stored = String(process.env.ADMIN_PASSWORD_HASH ?? '');
  const [scheme, salt, expectedHex] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !expectedHex || !expectedEmail) return false;
  try {
    const actual = scryptSync(candidate, salt, 64);
    const expected = Buffer.from(expectedHex, 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function adminEmailMatches(email: string): boolean {
  return email.trim().toLowerCase() === String(process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
}
