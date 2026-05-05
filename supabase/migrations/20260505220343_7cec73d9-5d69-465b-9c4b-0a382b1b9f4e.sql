-- Per-user soft delete for conversations
CREATE TABLE public.conversation_deletions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  user_id UUID NOT NULL,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);

CREATE INDEX idx_conv_del_user ON public.conversation_deletions(user_id);
CREATE INDEX idx_conv_del_conv ON public.conversation_deletions(conversation_id);

ALTER TABLE public.conversation_deletions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conv_del read own"
  ON public.conversation_deletions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "conv_del insert own"
  ON public.conversation_deletions FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_conversation_member(conversation_id, auth.uid()));

CREATE POLICY "conv_del delete own"
  ON public.conversation_deletions FOR DELETE
  USING (auth.uid() = user_id);

-- When a new message arrives, clear any prior deletion marks so the conversation
-- reappears in both participants' inboxes.
CREATE OR REPLACE FUNCTION public.clear_conversation_deletions_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.conversation_deletions
   WHERE conversation_id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clear_conv_deletions ON public.messages;
CREATE TRIGGER trg_clear_conv_deletions
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.clear_conversation_deletions_on_message();