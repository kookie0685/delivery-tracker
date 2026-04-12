# Delivery Tracker

Delivery Tracker is a responsive logistics web app for managing delivery vehicles, route stops, goods delivered, invoice references, payment collections, credit adjustments, and outstanding balances.

The app does not generate invoices. It stores only invoice reference numbers produced by external accounting systems along with collections and credit activity.

## Features

- Admin workspace for vehicles, drivers, delivery visibility, payment reports, and outstanding totals
- Driver workspace for assigned vehicle context, stop entry, goods recording, invoice references, proof image upload, payments, and credits
- Finance workspace for payment collections, customer ledger tracking, and outstanding reports
- Dashboard cards and charts for daily operations
- CSV export for vehicle report, payment report, outstanding payments, and customer ledger
- Local seeded data with browser persistence for demo and review use

## Tech Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- shadcn-ui components
- Recharts

## Local Development

```sh
npm install
npm run dev
```

The local dev server runs on `http://localhost:8080`.

## Verification

```sh
npm test
npm run build
```

## Supabase Setup

1. Create a Supabase project.
2. In the Supabase SQL editor, run [supabase/schema.sql](/Users/kirannair/Documents/New%20project/review_app/swift-route-logi-732c726a58da2aa93df3ea379935753d3ddff160/supabase/schema.sql).
3. Create a public storage bucket named `delivery-proofs`.
4. Copy [.env.example](/Users/kirannair/Documents/New%20project/review_app/swift-route-logi-732c726a58da2aa93df3ea379935753d3ddff160/.env.example) to `.env.local` and fill in:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Restart the dev server.

When Supabase is configured, the app loads vehicles, customers, stops, invoice references, payments, credits, and proof metadata from the database. Without it, the app falls back to browser-local demo data.

## Deployment

This project is ready for static deployment on Vercel or Netlify.

### Vercel

- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`
- SPA rewrites are configured in [vercel.json](/Users/kirannair/Documents/New%20project/review_app/swift-route-logi-732c726a58da2aa93df3ea379935753d3ddff160/vercel.json)

### Netlify

- Build command: `npm run build`
- Publish directory: `dist`
- SPA fallback is configured in [netlify.toml](/Users/kirannair/Documents/New%20project/review_app/swift-route-logi-732c726a58da2aa93df3ea379935753d3ddff160/netlify.toml)

## Project Structure

- [src/pages/Index.tsx](/Users/kirannair/Documents/New%20project/review_app/swift-route-logi-732c726a58da2aa93df3ea379935753d3ddff160/src/pages/Index.tsx): role-based UI
- [src/lib/delivery-tracker.ts](/Users/kirannair/Documents/New%20project/review_app/swift-route-logi-732c726a58da2aa93df3ea379935753d3ddff160/src/lib/delivery-tracker.ts): seeded data, ledger logic, outstanding calculations, exports
- [src/test/example.test.ts](/Users/kirannair/Documents/New%20project/review_app/swift-route-logi-732c726a58da2aa93df3ea379935753d3ddff160/src/test/example.test.ts): logic verification

## Notes

- Data is stored in browser `localStorage` for now.
- The current version is front-end only and ready to be connected to a backend later.
- Future-ready areas include GPS tracking, WhatsApp notifications, and accounting system integration.
