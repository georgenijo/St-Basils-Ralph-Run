-- Migration: Repair tables skipped by the April 2026 migration-push failures
--
-- Root cause: a timestamp collision (both `event_rsvps` and `site_settings`
-- shipped as 20260412000000) caused `supabase db push` to record version
-- 20260412000000 as applied while only `site_settings` actually got created.
-- `event_rsvps` (and its `events.rsvp_settings` column) were never created, and
-- `admin_audit_log` (20260329000000) is in the same recorded-but-absent state.
-- Because both versions are already in the remote migration history, a normal
-- `db push` skips them forever, so those tables stay missing on prod. The
-- visible symptom: the admin Users page ACTIVITY panel always shows
-- "No activity recorded yet" — every `admin_audit_log` insert silently fails.
--
-- This migration ships under a fresh version so `db push` WILL apply it, and is
-- fully idempotent (IF NOT EXISTS / DROP-then-CREATE) so it is safe whether the
-- objects are absent, partially present, or already complete. It reproduces the
-- original DDL from:
--   20260329000000_create_audit_log.sql  (#134)
--   20260412000000_create_event_rsvps.sql (#183)

-- ════════════════════════════════════════════════════════════════════════
--  admin_audit_log  (#134)
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id       UUID NOT NULL REFERENCES auth.users(id),
  action         TEXT NOT NULL CHECK (action IN (
                   'user.invite', 'user.role_change', 'user.deactivate',
                   'user.reactivate', 'user.password_reset'
                 )),
  target_user_id UUID NOT NULL REFERENCES auth.users(id),
  metadata       JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target_user_id
  ON public.admin_audit_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at
  ON public.admin_audit_log(created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- SELECT: admins can read the log
DROP POLICY IF EXISTS "Admins can read audit log" ON public.admin_audit_log;
CREATE POLICY "Admins can read audit log"
  ON public.admin_audit_log FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- INSERT: admins can write new entries
DROP POLICY IF EXISTS "Admins can insert audit log" ON public.admin_audit_log;
CREATE POLICY "Admins can insert audit log"
  ON public.admin_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- No UPDATE or DELETE policies — audit log is append-only.

-- ════════════════════════════════════════════════════════════════════════
--  events.rsvp_settings + event_rsvps  (#183)
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS rsvp_settings JSONB DEFAULT '{"enabled": false}'::jsonb;

CREATE TABLE IF NOT EXISTS public.event_rsvps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  family_id UUID REFERENCES public.families(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  headcount INT NOT NULL DEFAULT 1,
  children_count INT,
  dietary TEXT,
  bringing TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, name)
);

CREATE INDEX IF NOT EXISTS idx_event_rsvps_event_id ON public.event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_family_id ON public.event_rsvps(family_id);

ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

-- INSERT: anyone can insert an RSVP, but only for events with RSVP enabled.
DROP POLICY IF EXISTS "Public can insert RSVPs" ON public.event_rsvps;
CREATE POLICY "Public can insert RSVPs"
  ON public.event_rsvps FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_rsvps.event_id
        AND (events.rsvp_settings->>'enabled')::boolean = true
    )
  );

-- SELECT: admins can read all RSVPs
DROP POLICY IF EXISTS "Admins can read all RSVPs" ON public.event_rsvps;
CREATE POLICY "Admins can read all RSVPs"
  ON public.event_rsvps FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- SELECT: members can read their own family's RSVPs
DROP POLICY IF EXISTS "Members can read own family RSVPs" ON public.event_rsvps;
CREATE POLICY "Members can read own family RSVPs"
  ON public.event_rsvps FOR SELECT
  TO authenticated
  USING (
    family_id IS NOT NULL
    AND family_id = (SELECT family_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

-- UPDATE: admins only
DROP POLICY IF EXISTS "Admins can update RSVPs" ON public.event_rsvps;
CREATE POLICY "Admins can update RSVPs"
  ON public.event_rsvps FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- DELETE: admins only
DROP POLICY IF EXISTS "Admins can delete RSVPs" ON public.event_rsvps;
CREATE POLICY "Admins can delete RSVPs"
  ON public.event_rsvps FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Auto-update updated_at
DROP TRIGGER IF EXISTS set_event_rsvps_updated_at ON public.event_rsvps;
CREATE TRIGGER set_event_rsvps_updated_at
  BEFORE UPDATE ON public.event_rsvps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
