-- Centralize the current share price and membership dues in the site settings singleton.
-- Historical shares retain the amount charged when they were purchased.

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS share_price NUMERIC(10, 2) NOT NULL DEFAULT 50
    CHECK (share_price > 0),
  ADD COLUMN IF NOT EXISTS membership_monthly_dues NUMERIC(10, 2) NOT NULL DEFAULT 100
    CHECK (membership_monthly_dues > 0),
  ADD COLUMN IF NOT EXISTS membership_annual_dues NUMERIC(10, 2) NOT NULL DEFAULT 1200
    CHECK (membership_annual_dues > 0);

-- A fixed CHECK constraint would make site_settings ineffective. The action always
-- writes the configured price, and the member INSERT policy enforces that value.
ALTER TABLE public.shares DROP CONSTRAINT IF EXISTS shares_amount_check;
ALTER TABLE public.shares ALTER COLUMN amount DROP DEFAULT;

DROP POLICY IF EXISTS "Insert shares" ON public.shares;
CREATE POLICY "Insert shares"
  ON public.shares FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (
      family_id = (SELECT family_id FROM public.profiles WHERE id = (SELECT auth.uid()))
      AND paid = false
      AND amount = COALESCE(
        (SELECT share_price FROM public.site_settings LIMIT 1),
        50
      )
    )
  );
