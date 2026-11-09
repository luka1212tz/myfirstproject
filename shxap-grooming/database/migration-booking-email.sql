-- Run once in Neon SQL Editor before deploying the booking email update.
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT '';
