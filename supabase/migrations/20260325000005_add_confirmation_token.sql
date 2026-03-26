-- Migration: Add confirmation_token to email_subscribers
-- Phase: 4d
-- Ticket: 4d-01

ALTER TABLE public.email_subscribers
  ADD COLUMN confirmation_token UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE;

CREATE INDEX idx_email_subscribers_confirmation_token
  ON public.email_subscribers(confirmation_token);
