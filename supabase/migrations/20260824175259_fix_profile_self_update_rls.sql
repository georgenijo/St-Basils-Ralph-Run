-- Repair recursive profile self-update policy.
--
-- 20260329000001 moved the role/is_active checks into SECURITY DEFINER
-- helpers so the profiles policy would not recursively query profiles through
-- RLS. 20260409000000 later recreated the policy with inline profiles
-- subqueries while adding the family_id freeze, reintroducing error 42P17.
--
-- Keep every protected value behind a no-argument helper bound to auth.uid().
-- This permits legitimate profile edits while preventing members from changing
-- their role, activation state, or family assignment.

CREATE OR REPLACE FUNCTION public.own_role()
RETURNS text
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.own_is_active()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = ''
AS $$
  SELECT is_active FROM public.profiles WHERE id = (SELECT auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.own_family_id()
RETURNS uuid
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = ''
AS $$
  SELECT family_id FROM public.profiles WHERE id = (SELECT auth.uid())
$$;

REVOKE EXECUTE ON FUNCTION public.own_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.own_role() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.own_is_active() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.own_is_active() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.own_family_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.own_family_id() TO authenticated;

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    id = (SELECT auth.uid())
    AND is_active = true
  )
  WITH CHECK (
    id = (SELECT auth.uid())
    AND role = public.own_role()
    AND is_active = public.own_is_active()
    AND family_id IS NOT DISTINCT FROM public.own_family_id()
  );
