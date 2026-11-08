import { readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';

for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match) process.env[match[1]] = match[2];
}

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing from .env.');

const sql = neon(process.env.DATABASE_URL);
const requiredTables = ['site_settings', 'services', 'working_hours', 'bookings', 'booking_rate_limits'];
const tables = await sql.query(
  'SELECT tablename FROM pg_tables WHERE schemaname = $1 AND tablename = ANY($2) ORDER BY tablename',
  ['public', requiredTables],
);
const found = new Set(tables.map((row) => row.tablename));
const missing = requiredTables.filter((table) => !found.has(table));
if (missing.length) throw new Error(`Database schema is incomplete. Missing: ${missing.join(', ')}`);

console.log('Neon connection and required booking tables are available.');
