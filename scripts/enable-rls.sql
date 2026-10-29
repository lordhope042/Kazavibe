-- Supabase publishes the "public" schema through an automatic REST API. Turning on Row Level Security with no policies
-- blocks that API completely, while KazaVibe's own server (which connects as the owner role) keeps full access.
-- Run once after the first migration and again after any migration that adds tables:  npm run db:secure
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;
