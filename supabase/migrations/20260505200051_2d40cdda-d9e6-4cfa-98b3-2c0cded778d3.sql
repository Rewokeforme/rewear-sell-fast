-- Messages: flagging for anti-fraud
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flagged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flag_reason text;

-- Backfill is_read from existing read_at
UPDATE public.messages SET is_read = true WHERE read_at IS NOT NULL AND is_read = false;

-- Conversations: previews, unread counts, status
DO $$ BEGIN
  CREATE TYPE public.conversation_status AS ENUM ('active', 'archived', 'blocked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS last_message_preview text,
  ADD COLUMN IF NOT EXISTS unread_count_for_buyer integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unread_count_for_seller integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status public.conversation_status NOT NULL DEFAULT 'active';

-- Trigger: keep preview + unread counts in sync on new message
CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer uuid;
  v_seller uuid;
BEGIN
  SELECT buyer_id, seller_id INTO v_buyer, v_seller
    FROM public.conversations WHERE id = NEW.conversation_id;

  UPDATE public.conversations
    SET last_message_at = NEW.created_at,
        last_message_preview = LEFT(NEW.body, 160),
        unread_count_for_buyer = CASE WHEN NEW.sender_id = v_buyer THEN unread_count_for_buyer ELSE unread_count_for_buyer + 1 END,
        unread_count_for_seller = CASE WHEN NEW.sender_id = v_seller THEN unread_count_for_seller ELSE unread_count_for_seller + 1 END
    WHERE id = NEW.conversation_id;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_messages_update_conversation ON public.messages;
CREATE TRIGGER trg_messages_update_conversation
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.update_conversation_on_message();

-- Trigger: when a message is marked read, decrement the right counter
CREATE OR REPLACE FUNCTION public.handle_message_read()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer uuid;
  v_seller uuid;
BEGIN
  IF (OLD.read_at IS NULL AND NEW.read_at IS NOT NULL) THEN
    SELECT buyer_id, seller_id INTO v_buyer, v_seller
      FROM public.conversations WHERE id = NEW.conversation_id;
    -- The recipient is the one who is NOT the sender
    IF NEW.sender_id = v_buyer THEN
      UPDATE public.conversations
        SET unread_count_for_seller = GREATEST(unread_count_for_seller - 1, 0)
        WHERE id = NEW.conversation_id;
    ELSE
      UPDATE public.conversations
        SET unread_count_for_buyer = GREATEST(unread_count_for_buyer - 1, 0)
        WHERE id = NEW.conversation_id;
    END IF;
    NEW.is_read = true;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_messages_handle_read ON public.messages;
CREATE TRIGGER trg_messages_handle_read
BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.handle_message_read();