-- Admin messages table: read-only messages from Rewear team to a user
CREATE TABLE public.admin_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sent_by UUID,
  subject TEXT NOT NULL DEFAULT 'Svar från Rewear-teamet',
  body TEXT NOT NULL,
  related_listing_id UUID,
  related_conversation_id UUID,
  related_user_id UUID,
  related_report_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_messages read own or admin"
ON public.admin_messages FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin_messages insert admin"
ON public.admin_messages FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin_messages update own read flag"
ON public.admin_messages FOR UPDATE
USING (auth.uid() = user_id);

CREATE INDEX idx_admin_messages_user ON public.admin_messages(user_id, created_at DESC);
