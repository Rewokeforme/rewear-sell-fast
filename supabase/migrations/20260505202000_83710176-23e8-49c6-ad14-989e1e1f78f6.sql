
-- Add admin_reply to notification_type enum
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'admin_reply';

-- Add admin response fields to reports
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS admin_response text,
  ADD COLUMN IF NOT EXISTS responded_by uuid,
  ADD COLUMN IF NOT EXISTS responded_at timestamptz;

-- Add admin response fields to user_reports
ALTER TABLE public.user_reports
  ADD COLUMN IF NOT EXISTS admin_response text,
  ADD COLUMN IF NOT EXISTS responded_by uuid,
  ADD COLUMN IF NOT EXISTS responded_at timestamptz;

-- Allow admins to update reports (resolve/respond)
DROP POLICY IF EXISTS "reports admin update" ON public.reports;
CREATE POLICY "reports admin update"
ON public.reports
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));
