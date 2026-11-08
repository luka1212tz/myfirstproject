import type { VercelRequest, VercelResponse } from '@vercel/node';
import { database } from './_lib/db.js';
import { json, methodNotAllowed, validDate } from './_lib/http.js';

const TIME_ZONE_OFFSET = '+04:00';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  const date = String(req.query.date ?? '');
  const serviceId = String(req.query.serviceId ?? '');
  if (!validDate(date) || !/^[0-9a-f-]{36}$/i.test(serviceId)) return json(res, 400, { error: 'Choose a valid date and service.' });

  try {
    const sql = database();
    const weekday = new Date(`${date}T12:00:00${TIME_ZONE_OFFSET}`).getDay();
    const [services, hoursRows, blocked, booked] = await Promise.all([
      sql`SELECT duration_minutes FROM services WHERE id = ${serviceId} AND is_active = true LIMIT 1`,
      sql`SELECT is_open, open_time::text AS open_time, close_time::text AS close_time FROM working_hours WHERE weekday = ${weekday} LIMIT 1`,
      sql`SELECT id FROM blocked_dates WHERE blocked_date = ${date}::date LIMIT 1`,
      sql`SELECT starts_at, ends_at FROM bookings WHERE starts_at < ((${date}::date + interval '1 day') AT TIME ZONE 'Asia/Tbilisi') AND ends_at > (${date}::date AT TIME ZONE 'Asia/Tbilisi') AND status IN ('pending', 'confirmed')`,
    ]);

    const service = services[0];
    const hours = hoursRows[0];
    if (!service || !hours?.is_open || blocked.length) return json(res, 200, { date, slots: [] });

    const duration = Number(service.duration_minutes);
    const openTime = String(hours.open_time).slice(0, 5);
    const closeTime = String(hours.close_time).slice(0, 5);
    const slots: string[] = [];
    const toMinutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
    const open = toMinutes(openTime);
    const close = toMinutes(closeTime);
    const busy = booked.map((row: any) => [new Date(row.starts_at).getTime(), new Date(row.ends_at).getTime()]);

    for (let start = open; start + duration <= close; start += 30) {
      const hour = String(Math.floor(start / 60)).padStart(2, '0');
      const minute = String(start % 60).padStart(2, '0');
      const label = `${hour}:${minute}`;
      const startAt = new Date(`${date}T${label}:00${TIME_ZONE_OFFSET}`).getTime();
      const endAt = startAt + duration * 60000;
      const overlaps = busy.some(([busyStart, busyEnd]: number[]) => startAt < busyEnd && endAt > busyStart);
      if (!overlaps && startAt > Date.now()) slots.push(label);
    }
    return json(res, 200, { date, slots });
  } catch (error) {
    console.error('Availability error:', error);
    return json(res, 500, { error: 'Could not load available times.' });
  }
}
