
-- Add 'style_alert_match' to notification_type enum
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'style_alert_match';
