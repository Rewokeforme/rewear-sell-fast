
-- FK so PostgREST embed works for reporter
ALTER TABLE public.user_reports
  DROP CONSTRAINT IF EXISTS user_reports_reporter_id_fkey,
  ADD CONSTRAINT user_reports_reporter_id_fkey
    FOREIGN KEY (reporter_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- reports.reporter_id -> profiles.id
ALTER TABLE public.reports
  DROP CONSTRAINT IF EXISTS reports_reporter_id_profiles_fkey;

-- Drop existing reporter_id fk if pointing elsewhere then add to profiles
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reports_reporter_id_fkey' AND conrelid = 'public.reports'::regclass
  ) THEN
    ALTER TABLE public.reports DROP CONSTRAINT reports_reporter_id_fkey;
  END IF;
END $$;

ALTER TABLE public.reports
  ADD CONSTRAINT reports_reporter_id_fkey
    FOREIGN KEY (reporter_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
