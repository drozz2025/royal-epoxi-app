# Setup

## 1. Supabase
Create a Supabase project and run, in order:
1. `supabase/schema.sql`
2. `supabase/rls.sql`
3. Optional development data: `supabase/seed.sql`

Create the first user in Supabase Authentication and then add the corresponding row to `profiles` with role `ADMIN`.

## 2. Environment
Copy `.env.example` to `.env.local` and fill `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

Never commit service-role keys or passwords.

## 3. Install and run
`npm install`
`npm run dev`

## Production
Use a managed Next.js deployment (for example Vercel) and configure the same environment variables. Run a production build before deployment.
