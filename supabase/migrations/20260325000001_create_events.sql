-- Migration: Create events tables (events, recurrence_rules, event_instances)
-- Phase: 4b
-- Ticket: 4b-01

-- Create enum type for event categories
CREATE TYPE event_category AS ENUM ('liturgical', 'community', 'special');

-- Create events table
CREATE TABLE public.events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description JSONB,
  location TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  is_recurring BOOLEAN DEFAULT false NOT NULL,
  category event_category NOT NULL DEFAULT 'community',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX idx_events_slug ON public.events(slug);
CREATE INDEX idx_events_start_at ON public.events(start_at);
CREATE INDEX idx_events_category ON public.events(category);
CREATE INDEX idx_events_is_recurring ON public.events(is_recurring);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- SELECT: anyone can read events
CREATE POLICY "Public can read events"
  ON public.events FOR SELECT
  TO anon, authenticated
  USING (true);

-- INSERT: admin only
CREATE POLICY "Admins can insert events"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- UPDATE: admin only
CREATE POLICY "Admins can update events"
  ON public.events FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- DELETE: admin only
CREATE POLICY "Admins can delete events"
  ON public.events FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Auto-update updated_at (reuse existing function from profiles migration)
CREATE TRIGGER set_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Recurrence rules table
-- ============================================================

CREATE TABLE public.recurrence_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  rrule_string TEXT NOT NULL,
  dtstart TIMESTAMPTZ NOT NULL,
  until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX idx_recurrence_rules_event_id ON public.recurrence_rules(event_id);

-- Enable RLS
ALTER TABLE public.recurrence_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies (same pattern: public read, admin write)

CREATE POLICY "Public can read recurrence rules"
  ON public.recurrence_rules FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert recurrence rules"
  ON public.recurrence_rules FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update recurrence rules"
  ON public.recurrence_rules FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete recurrence rules"
  ON public.recurrence_rules FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Auto-update updated_at
CREATE TRIGGER set_recurrence_rules_updated_at
  BEFORE UPDATE ON public.recurrence_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Event instances table (exceptions/cancellations of recurring events)
-- ============================================================

CREATE TABLE public.event_instances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  original_date TIMESTAMPTZ NOT NULL,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  is_cancelled BOOLEAN DEFAULT false NOT NULL,
  title TEXT,
  description JSONB,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX idx_event_instances_event_id ON public.event_instances(event_id);
CREATE INDEX idx_event_instances_original_date ON public.event_instances(original_date);

-- Enable RLS
ALTER TABLE public.event_instances ENABLE ROW LEVEL SECURITY;

-- RLS Policies (same pattern: public read, admin write)

CREATE POLICY "Public can read event instances"
  ON public.event_instances FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert event instances"
  ON public.event_instances FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update event instances"
  ON public.event_instances FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete event instances"
  ON public.event_instances FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Auto-update updated_at
CREATE TRIGGER set_event_instances_updated_at
  BEFORE UPDATE ON public.event_instances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
