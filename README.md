# SHXAP GROOMING — website

A Vite + React + TypeScript website for SHXAP GROOMING in Batumi, with Vercel serverless API routes, Neon PostgreSQL, appointment requests, an owner dashboard, three public languages, and optional Vercel Blob image uploads.

## Important project notes

- This project is a **separate clean implementation**. The only older `class.zip` available in the file library was a Django `my_tennis_club` learning project, not the SHXAP website, so it was not modified.
- The site uses the exact business identity and listing supplied in the project brief: **SHXAP GROOMING**, Z. Gorgiladze N2, Batumi, Google Maps Place ID `ChIJcXQBEAd4B0AR2Y7XOG8Z0Zg`.
- Real prices, active services, phone number, WhatsApp number and opening hours were not supplied. The database starts with **no active services and all days closed**. The owner must configure these in `/admin` before customers can select a slot.
- No third-party salon photos, invented reviews, prices, opening hours or phone numbers are included. Gallery photos and testimonials must be added by the owner using authentic material.
- A submitted booking is stored as `pending`; it is not presented as confirmed. PostgreSQL has an exclusion constraint to prevent overlapping pending/confirmed bookings, including concurrent requests.
- WhatsApp opens with a prefilled booking message only after `WHATSAPP_NUMBER` or the admin WhatsApp field has been configured. The app does not claim an automated message has been sent.

## Stack

- React 19, Vite 8, TypeScript 7
- Vercel Node functions under `/api`
- Neon PostgreSQL using `@neondatabase/serverless`
- Vercel Blob client uploads (`BLOB_READ_WRITE_TOKEN` optional)
- Responsive custom CSS; no Tailwind build dependency

## 1. Requirements

- Node.js 22.12 or newer (required by the current Vite toolchain)
- A Neon PostgreSQL database
- A Vercel project for deployment
- A Vercel Blob store only if you want in-dashboard photo uploads

## 2. Install

```bash
npm install
```

Copy `.env.example` to `.env` for local work and set each real value. Do not commit `.env`.

## 3. Create the database

1. Create a PostgreSQL database in Neon.
2. Open the Neon SQL Editor.
3. Run the entire `database/schema.sql` file once.
4. Copy the Neon connection string into `DATABASE_URL`.

The schema creates the business settings, services, working hours, blocked dates, customers, pets, bookings, gallery images and testimonials tables. It also installs the PostgreSQL overlap constraint for active bookings.

## 4. Create the owner login

Run:

```bash
npm run hash-admin
```

Use the generated `scrypt$...` value for `ADMIN_PASSWORD_HASH`. Set `ADMIN_EMAIL` to the owner's sign-in email. Create a long random value for `ADMIN_SESSION_SECRET` (at least 32 characters). Do not put any of these values in source code or a `VITE_` variable.

The dashboard is at `/admin`. It uses an HttpOnly, SameSite=Strict cookie with an eight-hour expiry. Changing `ADMIN_SESSION_SECRET` invalidates existing sessions.

## 5. Run locally

Vite alone serves the frontend, but it does **not** run the `/api` Vercel functions. For a full local test, use the Vercel development server:

```bash
npm.cmd run dev:vercel
```

Make sure the environment variables are available to the Vercel CLI. If you have linked the project, `vercel env pull .env.local` can retrieve configured development variables. Alternatively, keep a local `.env` file (never commit it).

For frontend-only styling work, `npm run dev` starts Vite at `http://localhost:5173`, but booking, admin and content API calls will not work unless the API is also running.

## 6. Configure the business in `/admin`

After signing in:

1. **Services & prices:** add the real services, duration and price. Leave a price blank until it is confirmed. Enable a service to publish it and make it bookable.
2. **Availability:** set the salon's real working hours for each weekday and block dates when closed.
3. **Business details:** add the real phone, email, WhatsApp number (international digits only, for example `9955...`) and a short introduction.
4. **Photo gallery:** upload original SHXAP GROOMING images after connecting Vercel Blob, or add a public HTTPS image URL.
5. **Testimonials:** add genuine customer feedback and identify its source accurately. These entries are displayed as testimonials, not automatically as Google reviews.

The public booking calendar uses the salon's local `Asia/Tbilisi` time. It displays 30-minute start increments and checks the duration of the chosen service against opening hours and existing appointments.

## 7. Vercel deployment

1. Push this project to a new GitHub repository.
2. Import that repository into Vercel.
3. Keep the framework preset as **Vite**. The API files in `/api` are deployed as Vercel Functions.
4. Add these environment variables in **Project → Settings → Environment Variables**:
   - `DATABASE_URL`
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD_HASH`
   - `ADMIN_SESSION_SECRET`
   - `WHATSAPP_NUMBER` (optional; can also be managed in the dashboard)
   - `SITE_URL` (recommended, for example your actual production domain)
   - `BLOB_READ_WRITE_TOKEN` (optional; create a Blob store in Vercel Storage to enable uploads)
5. Redeploy after changing environment variables.
6. Open `/admin`, sign in, and finish the setup checklist before publishing the booking link.

`vercel.json` handles `/admin`, `/sitemap.xml` and `/robots.txt`. The sitemap and robots output use `SITE_URL`, the Vercel production URL, or the deployment host. Set `SITE_URL` to your canonical public domain for best SEO results.

## 8. Booking email notifications

The public booking form asks the customer for a required email address. On submission, the API emails the salon and the customer; when the booking is marked Confirmed or Rejected in `/admin`, it emails the customer again.

Add these Vercel environment variables and redeploy:

- `RESEND_API_KEY` — private Resend API key (server-side only).
- `BOOKING_NOTIFICATION_EMAIL` — the salon inbox that should receive new booking notices.
- `RESEND_FROM_EMAIL` — sender address authorised by Resend, e.g. `SHXAP GROOMING <bookings@your-verified-domain.com>`.

For initial testing only, Resend's `onboarding@resend.dev` sender is restricted to the verified account recipient. Sending to arbitrary customers requires a domain you own and verify in Resend. Do not put an API key in frontend code or Git.

If your existing Neon database was created before customer email was added, run `database/migration-booking-email.sql` once in the Neon SQL Editor.

## 9. Image uploads

To enable uploads from the dashboard:

1. In the Vercel project, open **Storage** and create a **Blob** store with public access for public gallery photos.
2. Ensure Vercel adds `BLOB_READ_WRITE_TOKEN` to the deployed environments.
3. Redeploy.
4. In `/admin → Photo gallery`, select an image (JPG, PNG, WebP or AVIF, up to 5 MB).

The dashboard also accepts public HTTPS image URLs. Do not upload customer data or private photos without the owner's permission.

## 9. Validation and testing

Build the frontend and run TypeScript checks:

```bash
npm run build
```

Before launch, test these flows on the deployed Vercel URL:

- Admin login, logout, and expired/invalid sessions.
- Creating, editing, activating and hiding services.
- Creating, editing, publishing and deleting FAQs.
- Weekly hours and blocked dates.
- Slot generation for each weekday and service duration.
- Two simultaneous booking attempts for the same time (one must be rejected).
- Pending → confirmed/rejected/completed/cancelled transitions.
- Rescheduling and overlap prevention.
- WhatsApp prefilled link with the real business number.
- Uploading and deleting original gallery photos.
- Georgian, English and Russian navigation and booking form on phone and desktop.
- `/robots.txt`, `/sitemap.xml`, Maps directions and the Google review listing link.

No live Vercel deployment, external database connection, Lighthouse audit or end-to-end browser test was performed as part of generating this source archive. Lighthouse scores and production readiness must be verified after the project is connected to your own accounts and business details.

## Environment variables

| Variable | Required | Purpose |
|---|---:|---|
| `DATABASE_URL` | Yes | Neon PostgreSQL server-side connection |
| `ADMIN_EMAIL` | Yes | Owner login email |
| `ADMIN_PASSWORD_HASH` | Yes | Scrypt password hash created locally |
| `ADMIN_SESSION_SECRET` | Yes | Signs the admin session cookie |
| `WHATSAPP_NUMBER` | Optional | WhatsApp number, international digits only |
| `SITE_URL` | Recommended | Canonical public website origin for sitemap/robots |
| `BLOB_READ_WRITE_TOKEN` | Optional | Enables owner gallery uploads |

## Business links

- Google Maps: https://maps.app.goo.gl/uv7vUPoXWYzSyGrb7
- Instagram: https://www.instagram.com/showergrooming/
- TikTok: https://www.tiktok.com/@shxapgrooming
