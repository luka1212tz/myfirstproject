import type { VercelRequest, VercelResponse } from '@vercel/node';
import { database } from './_lib/db.js';
import { bodyObject, cleanText, json, methodNotAllowed, validDate, validTime } from './_lib/http.js';

const OFFSET = '+04:00';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  const input = bodyObject(req);
  const fullName = cleanText(input.fullName, 100);
  const phone = cleanText(input.phone, 30).replace(/[\s()-]/g, '');
  const customerEmail = cleanText(input.email, 254).toLowerCase();
  const petName = cleanText(input.petName, 60);
  const animalType = String(input.animalType ?? '');
  const breed = cleanText(input.breed, 100);
  const weight = input.weight === '' || input.weight == null ? null : Number(input.weight);
  const serviceId = String(input.serviceId ?? '');
  const date = String(input.date ?? '');
  const time = String(input.time ?? '');
  const customerNotes = cleanText(input.notes, 1000);
  const priceSelection = cleanText(input.priceSelection, 300);
  const puppyAge = input.puppyAge === '' || input.puppyAge == null ? null : Number(input.puppyAge);
  const notes = [priceSelection ? `შერჩეული მომსახურება და ფასი: ${priceSelection}` : '', puppyAge ? `ლეკვის ასაკი: ${puppyAge} თვე` : '', customerNotes ? `დამატებითი ინფორმაცია: ${customerNotes}` : ''].filter(Boolean).join('\n').slice(0, 1400);

  if (fullName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail) || !/^\+?[0-9]{7,15}$/.test(phone) || petName.length < 1 || !['dog', 'cat'].includes(animalType) || !/^[0-9a-f-]{36}$/i.test(serviceId) || !validDate(date) || !validTime(time) || (animalType === 'dog' && (weight === null || !priceSelection)) || (puppyAge !== null && (!Number.isFinite(puppyAge) || puppyAge < 1 || puppyAge > 72)) || (priceSelection.startsWith('ლეკვების კომპლექსი') && !(puppyAge !== null && puppyAge <= 6))) {
    return json(res, 400, { error: 'Please complete the required booking fields with valid information.' });
  }
  if (weight !== null && (!Number.isFinite(weight) || weight <= 0 || weight > 250)) return json(res, 400, { error: 'Enter a valid approximate pet weight.' });
  const requestedStart = new Date(`${date}T${time}:00${OFFSET}`);
  if (!Number.isFinite(requestedStart.getTime()) || requestedStart.getTime() <= Date.now() || requestedStart.getTime() > Date.now() + 90 * 86400000) {
    return json(res, 400, { error: 'Choose a future date within the next 90 days.' });
  }

  try {
    const sql = database();
    const ip = String(req.headers['x-forwarded-for'] ?? req.socket?.remoteAddress ?? 'unknown').split(',')[0].trim().slice(0, 80);
    const limitRows = await sql`
      INSERT INTO booking_rate_limits (key, window_started_at, request_count)
      VALUES (${ip}, now(), 1)
      ON CONFLICT (key) DO UPDATE SET
        request_count = CASE WHEN booking_rate_limits.window_started_at < now() - interval '10 minutes' THEN 1 ELSE booking_rate_limits.request_count + 1 END,
        window_started_at = CASE WHEN booking_rate_limits.window_started_at < now() - interval '10 minutes' THEN now() ELSE booking_rate_limits.window_started_at END
      RETURNING request_count`;
    if (Number(limitRows[0]?.request_count) > 5) return json(res, 429, { error: 'Too many booking requests. Please try again in a few minutes.' });

    const [services, hourRows, blocked] = await Promise.all([
      sql`SELECT id, name, animal_type, duration_minutes FROM services WHERE id = ${serviceId} AND is_active = true LIMIT 1`,
      sql`SELECT is_open, open_time::text AS open_time, close_time::text AS close_time FROM working_hours WHERE weekday = ${new Date(`${date}T12:00:00${OFFSET}`).getDay()} LIMIT 1`,
      sql`SELECT id FROM blocked_dates WHERE blocked_date = ${date}::date LIMIT 1`,
    ]);
    const service = services[0];
    const hours = hourRows[0];
    if (!service) return json(res, 400, { error: 'That service is not currently available.' });
    if (service.animal_type !== 'both' && service.animal_type !== animalType) return json(res, 400, { error: 'Choose a service for the selected pet type.' });
    if (!hours?.is_open || blocked.length) return json(res, 409, { error: 'The salon is not taking appointments on that date.' });

    const duration = Number(service.duration_minutes);
    const finish = new Date(requestedStart.getTime() + duration * 60000);
    const minutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
    const startMinutes = minutes(time);
    const endMinutes = startMinutes + duration;
    if (time < String(hours.open_time).slice(0, 5) || endMinutes > minutes(String(hours.close_time).slice(0, 5)) || (startMinutes - minutes(String(hours.open_time).slice(0, 5))) % 30 !== 0) {
      return json(res, 409, { error: 'That time is outside the available appointment schedule.' });
    }

    const conflicts = await sql`
      SELECT id FROM bookings
      WHERE starts_at < ${finish.toISOString()}::timestamptz
        AND ends_at > ${requestedStart.toISOString()}::timestamptz
        AND status IN ('pending', 'confirmed')
      LIMIT 1`;
    if (conflicts.length) return json(res, 409, { error: 'That appointment time has just been taken. Please choose another time.' });

    // One data-modifying CTE keeps customer, pet and booking creation atomic.
    const bookingRows = await sql`
      WITH saved_customer AS (
        INSERT INTO customers (full_name, phone, email)
        VALUES (${fullName}, ${phone}, ${customerEmail})
        ON CONFLICT (phone) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email, updated_at = now()
        RETURNING id
      ), saved_pet AS (
        INSERT INTO pets (customer_id, name, animal_type, breed, approximate_weight, notes)
        SELECT id, ${petName}, ${animalType}, ${breed}, ${weight}, ${notes} FROM saved_customer
        RETURNING id
      ), saved_booking AS (
        INSERT INTO bookings (customer_id, pet_id, service_id, starts_at, ends_at, customer_note)
        SELECT saved_customer.id, saved_pet.id, ${serviceId}, ${requestedStart.toISOString()}::timestamptz, ${finish.toISOString()}::timestamptz, ${notes}
        FROM saved_customer CROSS JOIN saved_pet
        RETURNING id, status
      )
      SELECT id, status FROM saved_booking`;

    const bookingId = String(bookingRows[0].id);
    const ownerEmailSent = await sendBookingEmail({ to: process.env.BOOKING_NOTIFICATION_EMAIL || process.env.OWNER_EMAIL || '', subject: 'New SHXAP GROOMING booking', html: `<h2>New booking request</h2><p>${escapeHtml(fullName)} · ${escapeHtml(phone)}</p><p>Customer email: ${escapeHtml(customerEmail)}</p><p>Pet: ${escapeHtml(petName)} (${escapeHtml(animalType)}) · ${escapeHtml(breed)} · ${weight ?? 'Weight not provided'} kg</p>${puppyAge ? `<p>Puppy age: ${puppyAge} months</p>` : ''}<p>Service category: ${escapeHtml(service.name)}</p><p>Selected option / price: ${escapeHtml(priceSelection || 'Not specified')}</p><p>Date: ${escapeHtml(date)} at ${escapeHtml(time)}</p><p>Notes: ${escapeHtml(customerNotes || 'None')}</p><p>Booking ID: ${bookingId}</p><p>Review it in /admin.</p>` });
    const customerEmailSent = await sendBookingEmail({ to: customerEmail, subject: 'SHXAP GROOMING received your booking request', html: `<h2>Booking request received</h2><p>Hello ${escapeHtml(fullName)},</p><p>We received your request for ${escapeHtml(petName)} on ${escapeHtml(date)} at ${escapeHtml(time)}.</p><p>Service: ${escapeHtml(service.name)}</p><p>Selected option / price: ${escapeHtml(priceSelection || 'To be confirmed by the salon')}</p><p>Dog weight: ${weight ?? 'Not provided'} kg</p><p>Your appointment is <strong>pending confirmation</strong>. The salon will contact you when its status changes.</p><p>Reference: ${bookingId}</p>` });
    return json(res, 201, { bookingId, status: bookingRows[0].status, serviceName: service.name, durationMinutes: duration, ownerEmailSent, customerEmailSent });
  } catch (error: any) {
    if (error?.code === '23P01' || error?.constraint === 'bookings_no_active_overlap') {
      return json(res, 409, { error: 'That time has just been booked. Please choose another time.' });
    }
    console.error('Booking create error:', error);
    return json(res, 500, { error: 'Your request could not be saved. Please try again or contact the salon.' });
  }
}

async function sendBookingEmail(message: {to:string; subject:string; html:string}): Promise<boolean> {
  if (!message.to || !process.env.RESEND_API_KEY) { console.warn('Booking email skipped: configure RESEND_API_KEY and recipient email.'); return false; }
  try {
    const response = await fetch('https://api.resend.com/emails', { method:'POST', headers:{ Authorization:`Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type':'application/json' }, body:JSON.stringify({ from:process.env.RESEND_FROM_EMAIL || 'SHXAP GROOMING <onboarding@resend.dev>', to:[message.to], subject:message.subject, html:message.html }) });
    if (!response.ok) { console.error('Resend email failed:', response.status, await response.text()); return false; }
    return true;
  } catch (error) { console.error('Booking email error:', error); return false; }
}
function escapeHtml(value:string) { return value.replace(/[&<>\"']/g, (character) => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[character] || character)); }
