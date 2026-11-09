import type { VercelRequest, VercelResponse } from '@vercel/node';
import { database } from './_lib/db.js';
import { json, methodNotAllowed } from './_lib/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  try {
    const sql = database();
    // Ensure every published dog price category has a matching bookable database service.
    // Older versions seeded all categories only when the entire services table was empty,
    // which left customers with a pricing list but no matching booking options.
    const defaults = [
      ['ლეკვების კომპლექსი (6 თვემდე)', 'ლეკვების მოვლა; ფასები ჯიშის მიხედვით: 50–55 ₾', 50, 90, 0],
      ['ჰიგიენური კომპლექსი', 'ჰიგიენური მოვლა; ფასი წონის მიხედვით: 50–100+ ₾', 50, 60, 1],
      ['შეკრეჭა', 'შეკრეჭა; ფასი ჯიშისა და ზომის მიხედვით: 70–130 ₾', 70, 120, 2],
      ['შეკრეჭა: ჯიშები', 'ჯიშების მიხედვით შეკრეჭა: 60–130 ₾', 60, 120, 3],
      ['სხვა ჯიშები', 'ფასი ბეწვის სიგრძის, სტრუქტურისა და დახვეულობის მიხედვით: 70–100 ₾', 70, 120, 4],
      ['ტრიმინგი', 'ტრიმინგი და სრული მოვლა: 80–105 ₾', 80, 120, 5],
    ];
    for (const [name, description, price, duration, order] of defaults) {
      const matching = await sql`SELECT id, is_active FROM services WHERE name = ${name} AND animal_type = 'dog' LIMIT 1`;
      if (!matching.length) {
        await sql`INSERT INTO services (name, description, animal_type, price, duration_minutes, is_active, sort_order) VALUES (${name}, ${description}, 'dog', ${price}, ${duration}, true, ${order})`;
      } else if (!matching[0].is_active) {
        // These six supplied price categories are specifically requested as public booking options.
        await sql`UPDATE services SET is_active = true WHERE id = ${matching[0].id}`;
      }
    }
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
