import type { VercelRequest, VercelResponse } from '@vercel/node';

function siteUrl(req: VercelRequest) {
  const configured = String(process.env.SITE_URL || '').trim();
  if (configured) return configured.replace(/\/$/, '');
  const vercel = String(process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || '').trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, '').replace(/\/$/, '')}`;
  const host = String(req.headers.host || '').replace(/[^a-zA-Z0-9.:-]/g, '');
  return host ? `https://${host}` : '';
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end();
  const base = siteUrl(req);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${base}/</loc><changefreq>monthly</changefreq><priority>1.0</priority></url>\n</urlset>`;
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.status(200).send(xml);
}
