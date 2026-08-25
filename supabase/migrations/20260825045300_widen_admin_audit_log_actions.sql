-- Widen the admin audit action allowlist for invite resends and family management.
-- Issues: #269, #263

ALTER TABLE public.admin_audit_log
  DROP CONSTRAINT IF EXISTS admin_audit_log_action_check;

ALTER TABLE public.admin_audit_log
  ADD CONSTRAINT admin_audit_log_action_check CHECK (action IN (
    'user.invite',
    'user.invite.resend',
    'user.role_change',
    'user.deactivate',
    'user.reactivate',
    'user.password_reset',
    'family.create',
    'family.update',
    'family.assign_member',
    'family.remove_member'
  ));
