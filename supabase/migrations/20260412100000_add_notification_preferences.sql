-- Migration: Add notification_preferences column to profiles
-- Issue: #184
-- NOTE: Idempotent — safe to re-run if partially applied by a prior collision.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'notification_preferences'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN notification_preferences JSONB NOT NULL
      DEFAULT '{"payments": true, "membership": true, "shares": true, "events": true}'::jsonb;
  END IF;
END $$;
