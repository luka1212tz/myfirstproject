export function json(res: any, status: number, data: unknown) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

export function methodNotAllowed(res: any, allowed: string[]) {
  res.setHeader('Allow', allowed.join(', '));
  return json(res, 405, { error: 'Method not allowed.' });
}

export function bodyObject(req: any): Record<string, any> {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
}

export function cleanText(value: unknown, maxLength = 500): string {
  return String(value ?? '').trim().slice(0, maxLength);
}

export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00+04:00`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/**
 * State-changing owner requests must originate from this deployment.  The
 * session cookie is SameSite=Strict as a second line of defence, but checking
 * Origin also prevents cross-site form/fetch requests from using a valid
 * session in browsers that send cookies unexpectedly.
 */
export function isSameOriginRequest(req: any): boolean {
  const origin = String(req.headers?.origin ?? '');
  const host = String(req.headers?.['x-forwarded-host'] ?? req.headers?.host ?? '');
  if (!origin || !host) return false;
  const protocol = String(req.headers?.['x-forwarded-proto'] ?? (process.env.NODE_ENV === 'production' ? 'https' : 'http')).split(',')[0].trim();
  try {
    return new URL(origin).origin === `${protocol}://${host.split(',')[0].trim()}`;
  } catch {
    return false;
  }
}
