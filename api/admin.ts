import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isAdmin } from './_lib/auth.js';
import { database } from './_lib/db.js';
import { bodyObject, cleanText, isSameOriginRequest, json, methodNotAllowed, validDate, validTime } from './_lib/http.js';

const BOOKING_STATUSES = ['pending', 'confirmed', 'rejected', 'completed', 'cancelled'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isAdmin(req)) return json(res, 401, { error: 'Please sign in to the owner dashboard.' });
  const sql = database();

  if (req.method === 'GET') {
    try {
      const [bookings, services, hours, blockedDates, settings, gallery, testimonials, faqs] = await Promise.all([
        sql`SELECT b.id, b.starts_at, b.ends_at, b.status, b.customer_note, c.full_name, c.phone,
                   p.name AS pet_name, p.animal_type, p.breed, p.approximate_weight,
                   s.name AS service_name
            FROM bookings b JOIN customers c ON c.id = b.customer_id
            JOIN pets p ON p.id = b.pet_id JOIN services s ON s.id = b.service_id
            ORDER BY b.starts_at DESC LIMIT 300`,
        sql`SELECT * FROM services ORDER BY sort_order, created_at DESC`,
        sql`SELECT * FROM working_hours ORDER BY weekday`,
        sql`SELECT * FROM blocked_dates ORDER BY blocked_date`,
        sql`SELECT * FROM site_settings WHERE id = true LIMIT 1`,
        sql`SELECT * FROM gallery_images ORDER BY sort_order, created_at DESC`,
        sql`SELECT * FROM testimonials ORDER BY created_at DESC`,
        sql`SELECT * FROM faqs ORDER BY sort_order, question`,
      ]);
      return json(res, 200, { bookings, services, hours, blockedDates, settings: settings[0] || null, gallery, testimonials, faqs });
    } catch (error) {
      console.error('Admin data error:', error);
      return json(res, 500, { error: 'Could not load dashboard data.' });
    }
  }

  if (req.method !== 'POST') return methodNotAllowed(res, ['GET', 'POST']);
  if (!isSameOriginRequest(req)) return json(res, 403, { error: 'Invalid request origin.' });
  const body = bodyObject(req);
  const action = String(body.action ?? '');
  try {
    if (action === 'booking.reschedule') {
      const id = String(body.id ?? '');
      const date = String(body.date ?? '');
      const time = String(body.time ?? '');
      if (!validDate(date) || !validTime(time)) return json(res, 400, { error: 'Enter a valid date (YYYY-MM-DD) and time (HH:MM).' });
      const requestedStart = new Date(`${date}T${time}:00+04:00`);
      if (requestedStart.getTime() <= Date.now()) return json(res, 400, { error: 'Appointments must be scheduled in the future.' });
      const currentRows = await sql`SELECT b.status, s.duration_minutes FROM bookings b JOIN services s ON s.id=b.service_id WHERE b.id=${id} LIMIT 1`;
      if (!currentRows.length) return json(res, 404, { error: 'Booking not found.' });
      if (!['pending','confirmed'].includes(String(currentRows[0].status))) return json(res, 409, { error: 'Only pending or confirmed bookings can be rescheduled.' });
      const weekday = new Date(`${date}T12:00:00+04:00`).getDay();
      const [hourRows, blocked] = await Promise.all([
        sql`SELECT is_open,open_time::text AS open_time,close_time::text AS close_time FROM working_hours WHERE weekday=${weekday} LIMIT 1`,
        sql`SELECT id FROM blocked_dates WHERE blocked_date=${date}::date LIMIT 1`,
      ]);
      const hours = hourRows[0];
      if (!hours?.is_open || blocked.length) return json(res, 409, { error: 'The salon is closed on that date.' });
      const duration = Number(currentRows[0].duration_minutes);
      const finish = new Date(requestedStart.getTime() + duration * 60000);
      const toMinutes = (v:string) => Number(v.slice(0,2))*60+Number(v.slice(3,5));
      const startMinutes = toMinutes(time);
      const openMinutes = toMinutes(String(hours.open_time).slice(0,5));
      const closeMinutes = toMinutes(String(hours.close_time).slice(0,5));
      if (startMinutes < openMinutes || startMinutes + duration > closeMinutes || (startMinutes-openMinutes)%30 !== 0) return json(res, 409, { error: 'That time is outside the available schedule.' });
      const conflicts = await sql`SELECT id FROM bookings WHERE id <> ${id} AND starts_at < ${finish.toISOString()}::timestamptz AND ends_at > ${requestedStart.toISOString()}::timestamptz AND status IN ('pending','confirmed') LIMIT 1`;
      if (conflicts.length) return json(res, 409, { error: 'That time overlaps another appointment.' });
      await sql`UPDATE bookings SET starts_at=${requestedStart.toISOString()}::timestamptz,ends_at=${finish.toISOString()}::timestamptz,updated_at=now() WHERE id=${id}`;
      return json(res, 200, { ok: true });
    }

    if (action === 'booking.status') {
      const status = String(body.status ?? '');
      if (!BOOKING_STATUSES.includes(status)) return json(res, 400, { error: 'Invalid booking status.' });
      const rows = await sql`UPDATE bookings SET status = ${status}, updated_at = now() WHERE id = ${String(body.id)} RETURNING id`;
      if (!rows.length) return json(res, 404, { error: 'Booking not found.' });
      return json(res, 200, { ok: true });
    }

    if (action === 'service.save') {
      const name = cleanText(body.name, 100);
      const animalType = String(body.animalType ?? '');
      const duration = Number(body.durationMinutes);
      const price = body.price === '' || body.price == null ? null : Number(body.price);
      if (!name || !['dog', 'cat', 'both'].includes(animalType) || !Number.isInteger(duration) || duration < 15 || duration > 480 || (price !== null && (!Number.isFinite(price) || price < 0))) {
        return json(res, 400, { error: 'Check the service name, animal type, duration and price.' });
      }
      const values = [name, cleanText(body.description, 1000), animalType, price, duration, cleanText(body.imageUrl, 2000), Boolean(body.isActive), Number(body.sortOrder) || 0] as const;
      if (body.id) {
        await sql`UPDATE services SET name=${values[0]}, description=${values[1]}, animal_type=${values[2]}, price=${values[3]}, duration_minutes=${values[4]}, image_url=${values[5]}, is_active=${values[6]}, sort_order=${values[7]}, updated_at=now() WHERE id=${String(body.id)}`;
      } else {
        await sql`INSERT INTO services (name, description, animal_type, price, duration_minutes, image_url, is_active, sort_order) VALUES (${values[0]},${values[1]},${values[2]},${values[3]},${values[4]},${values[5]},${values[6]},${values[7]})`;
      }
      return json(res, 200, { ok: true });
    }

    if (action === 'service.delete') {
      await sql`UPDATE services SET is_active=false, updated_at=now() WHERE id=${String(body.id)}`;
      return json(res, 200, { ok: true });
    }

    if (action === 'hours.save') {
      if (!Array.isArray(body.hours) || body.hours.length !== 7) return json(res, 400, { error: 'Send all seven days of working hours.' });
      for (const row of body.hours) {
        const weekday = Number(row.weekday);
        if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) continue;
        const isOpen = Boolean(row.isOpen);
        const openTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(row.openTime)) ? `${row.openTime}:00` : null;
        const closeTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(row.closeTime)) ? `${row.closeTime}:00` : null;
        if (isOpen && (!openTime || !closeTime || openTime >= closeTime)) return json(res, 400, { error: 'Check the opening and closing times.' });
        await sql`INSERT INTO working_hours (weekday,is_open,open_time,close_time) VALUES (${weekday},${isOpen},${isOpen ? openTime : null}::time,${isOpen ? closeTime : null}::time) ON CONFLICT (weekday) DO UPDATE SET is_open=EXCLUDED.is_open,open_time=EXCLUDED.open_time,close_time=EXCLUDED.close_time`;
      }
      return json(res, 200, { ok: true });
    }

    if (action === 'settings.save') {
      const phone = cleanText(body.phone, 40);
      const whatsapp = cleanText(body.whatsappNumber, 30).replace(/\D/g, '');
      const email = cleanText(body.email, 254);
      const intro = cleanText(body.intro, 1500);
      await sql`INSERT INTO site_settings (id,phone,whatsapp_number,email,intro) VALUES (true,${phone},${whatsapp},${email},${intro}) ON CONFLICT (id) DO UPDATE SET phone=EXCLUDED.phone,whatsapp_number=EXCLUDED.whatsapp_number,email=EXCLUDED.email,intro=EXCLUDED.intro,updated_at=now()`;
      return json(res, 200, { ok: true });
    }

    if (action === 'gallery.save') {
      const imageUrl = cleanText(body.imageUrl, 2000);
      if (!/^https:\/\//i.test(imageUrl)) return json(res, 400, { error: 'Use a secure https image URL.' });
      await sql`INSERT INTO gallery_images (image_url,alt_text,category,sort_order) VALUES (${imageUrl},${cleanText(body.altText,180)},${['dogs','cats','before-after','salon'].includes(body.category) ? body.category : 'dogs'},${Number(body.sortOrder)||0})`;
      return json(res, 200, { ok: true });
    }

    if (action === 'gallery.delete') {
      await sql`DELETE FROM gallery_images WHERE id=${String(body.id)}`;
      return json(res, 200, { ok: true });
    }

    if (action === 'faq.save') {
      const question = cleanText(body.question, 240);
      const answer = cleanText(body.answer, 1500);
      if (question.length < 4 || answer.length < 8) return json(res, 400, { error: 'Enter a question and a helpful answer.' });
      if (body.id) {
        await sql`UPDATE faqs SET question=${question},answer=${answer},is_published=${Boolean(body.isPublished)} WHERE id=${String(body.id)}`;
      } else {
        await sql`INSERT INTO faqs (question,answer,is_published) VALUES (${question},${answer},${body.isPublished !== false})`;
      }
      return json(res, 200, { ok: true });
    }

    if (action === 'faq.delete') {
      await sql`DELETE FROM faqs WHERE id=${String(body.id)}`;
      return json(res, 200, { ok: true });
    }

    if (action === 'testimonial.save') {
      const author = cleanText(body.authorName, 100);
      const review = cleanText(body.reviewText, 1500);
      const rating = Number(body.rating);
      if (!author || !review || !Number.isInteger(rating) || rating < 1 || rating > 5) return json(res, 400, { error: 'Enter an author, review text and a rating from 1 to 5.' });
      const reviewDate = /^\d{4}-\d{2}-\d{2}$/.test(String(body.reviewDate)) ? body.reviewDate : null;
      const source = cleanText(body.source || 'Owner-added testimonial', 100);
      if (body.id) {
        await sql`UPDATE testimonials SET author_name=${author},review_text=${review},rating=${rating},review_date=${reviewDate}::date,source=${source},is_published=${Boolean(body.isPublished)} WHERE id=${String(body.id)}`;
      } else {
        await sql`INSERT INTO testimonials (author_name,review_text,rating,review_date,source,is_published) VALUES (${author},${review},${rating},${reviewDate}::date,${source},${body.isPublished !== false})`;
      }
      return json(res, 200, { ok: true });
    }

    if (action === 'testimonial.delete') {
      await sql`DELETE FROM testimonials WHERE id=${String(body.id)}`;
      return json(res, 200, { ok: true });
    }

    if (action === 'blocked.add') {
      const date = String(body.date ?? '');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json(res, 400, { error: 'Choose a valid date.' });
      await sql`INSERT INTO blocked_dates (blocked_date,reason) VALUES (${date}::date,${cleanText(body.reason,180)}) ON CONFLICT (blocked_date) DO UPDATE SET reason=EXCLUDED.reason`;
      return json(res, 200, { ok: true });
    }

    if (action === 'blocked.delete') {
      await sql`DELETE FROM blocked_dates WHERE id=${String(body.id)}`;
      return json(res, 200, { ok: true });
    }

    return json(res, 400, { error: 'Unknown dashboard action.' });
  } catch (error: any) {
    if (error?.code === '23P01') return json(res, 409, { error: 'That change would overlap another active appointment.' });
    console.error('Admin action error:', action, error);
    return json(res, 500, { error: 'The change could not be saved.' });
  }
}
