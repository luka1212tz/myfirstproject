import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end();
  const configured = String(process.env.SITE_URL || '').trim().replace(/\/$/, '');
  const vercel = String(process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || '').trim();
  const host = String(req.headers.host || '').replace(/[^a-zA-Z0-9.:-]/g, '');
  const base = configured || (vercel ? `https://${vercel.replace(/^https?:\/\//, '')}` : host ? `https://${host}` : '');
  const body = `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n${base ? `Sitemap: ${base}/sitemap.xml\n` : ''}`;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.status(200).send(body);
}
