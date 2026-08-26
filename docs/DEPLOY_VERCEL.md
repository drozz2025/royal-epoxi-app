# Public deployment

1. Import `drozz2025/royal-epoxi-app` into Vercel.
2. Framework: Next.js (auto-detected).
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy.
5. The login route is `/login`.

The repository does not contain production secrets. Supabase credentials must be configured in the Vercel project settings.
