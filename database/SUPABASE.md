# Supabase setup (Academix)

1. Create a Supabase project.
2. In Supabase **SQL Editor**, run `database/supabase-schema.sql`.
3. Copy env vars into your local `.env` (see `.env.example`):
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

Notes
- If you enable Row Level Security (RLS), you must add policies; otherwise the backend will not be able to read/write using the anon key.

Troubleshooting
- If you see: `Could not find the table 'public.faculty_subjects' in the schema cache`, it means the table doesn't exist in your Supabase project yet (or PostgREST hasn't refreshed its schema cache). Re-run `database/supabase-schema.sql` in Supabase SQL Editor and wait ~30–60 seconds, then retry.
