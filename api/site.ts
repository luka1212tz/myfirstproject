import type { VercelRequest, VercelResponse } from '@vercel/node';
import { database } from './_lib/db.js';
import { json, methodNotAllowed } from './_lib/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  try {
    const sql = database();
    const [settings, services, gallery, testimonials, faqs, hours] = await Promise.all([
      sql`SELECT business_name, address, phone, whatsapp_number, email, intro FROM site_settings WHERE id = true LIMIT 1`,
      sql`SELECT id, name, description, animal_type, price, duration_minutes, image_url FROM services WHERE is_active = true ORDER BY sort_order, name`,
      sql`SELECT id, image_url, alt_text, category FROM gallery_images ORDER BY sort_order, created_at DESC LIMIT 30`,
      sql`SELECT id, author_name, review_text, rating, review_date, source FROM testimonials WHERE is_published = true ORDER BY review_date DESC NULLS LAST, created_at DESC LIMIT 12`,
      sql`SELECT id, question, answer FROM faqs WHERE is_published = true ORDER BY sort_order, id LIMIT 15`,
      sql`SELECT weekday, is_open, open_time, close_time FROM working_hours ORDER BY weekday`,
    ]);
    const configuredWhatsApp = String(settings[0]?.whatsapp_number || process.env.WHATSAPP_NUMBER || '').replace(/\D/g, '');
    return json(res, 200, {
      business: {
        name: settings[0]?.business_name || 'SHXAP GROOMING',
        address: settings[0]?.address || 'Z. Gorgiladze N2, Batumi, Georgia',
        phone: settings[0]?.phone || '',
        whatsappNumber: configuredWhatsApp,
        email: settings[0]?.email || '',
        intro: settings[0]?.intro || '',
        mapsUrl: 'https://maps.app.goo.gl/uv7vUPoXWYzSyGrb7',
        placeId: 'ChIJcXQBEAd4B0AR2Y7XOG8Z0Zg',
        instagram: 'https://www.instagram.com/showergrooming/',
        tiktok: 'https://www.tiktok.com/@shxapgrooming',
      },
      services, gallery, testimonials, faqs, hours,
    });
  } catch (error) {
    console.error('Public site data error:', error);
    return json(res, 500, { error: 'Website information is temporarily unavailable.' });
  }
}
