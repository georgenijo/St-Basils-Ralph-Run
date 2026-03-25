-- Seed: Events and recurrence rules
-- Source: Existing events-calendar.html (2024-2026 hardcoded events)
-- Location: 73 Ellis Street, Newton, MA 02464

-- ============================================================
-- Recurring Sunday Services
-- ============================================================

INSERT INTO public.events (id, title, slug, description, location, start_at, end_at, is_recurring, category)
VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    'Morning Prayer',
    'morning-prayer',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Sunday Morning Prayer service."}]}]}',
    '73 Ellis Street, Newton, MA 02464',
    '2024-01-07T08:30:00-05:00',
    '2024-01-07T09:15:00-05:00',
    true,
    'liturgical'
  ),
  (
    'a0000000-0000-0000-0000-000000000002',
    'Holy Qurbono',
    'holy-qurbono',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Sunday Holy Qurbono (Eucharist) service."}]}]}',
    '73 Ellis Street, Newton, MA 02464',
    '2024-01-07T09:15:00-05:00',
    '2024-01-07T11:00:00-05:00',
    true,
    'liturgical'
  );

-- Recurrence rules for Sunday services (RFC 5545 RRULE)
INSERT INTO public.recurrence_rules (event_id, rrule_string, dtstart, until)
VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    'FREQ=WEEKLY;BYDAY=SU',
    '2024-01-07T08:30:00-05:00',
    NULL
  ),
  (
    'a0000000-0000-0000-0000-000000000002',
    'FREQ=WEEKLY;BYDAY=SU',
    '2024-01-07T09:15:00-05:00',
    NULL
  );

-- ============================================================
-- Recurring Annual Liturgical Events (fixed-date feasts)
-- ============================================================

INSERT INTO public.events (id, title, slug, description, location, start_at, end_at, is_recurring, category)
VALUES
  (
    'a0000000-0000-0000-0000-000000000010',
    'Circumcision of Christ',
    'circumcision-of-christ',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Feast of the Circumcision of our Lord."}]}]}',
    '73 Ellis Street, Newton, MA 02464',
    '2026-01-01T09:00:00-05:00',
    '2026-01-01T11:00:00-05:00',
    true,
    'liturgical'
  ),
  (
    'a0000000-0000-0000-0000-000000000011',
    'Denho / Epiphany',
    'denho-epiphany',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Feast of Denho (Epiphany) — Baptism of our Lord."}]}]}',
    '73 Ellis Street, Newton, MA 02464',
    '2026-01-06T09:00:00-05:00',
    '2026-01-06T11:00:00-05:00',
    true,
    'liturgical'
  ),
  (
    'a0000000-0000-0000-0000-000000000012',
    'Annunciation',
    'annunciation',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Feast of the Annunciation to the Blessed Virgin Mary."}]}]}',
    '73 Ellis Street, Newton, MA 02464',
    '2026-03-25T09:00:00-04:00',
    '2026-03-25T11:00:00-04:00',
    true,
    'liturgical'
  ),
  (
    'a0000000-0000-0000-0000-000000000013',
    'Apostles Feast',
    'apostles-feast',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Feast of the Holy Apostles Peter and Paul."}]}]}',
    '73 Ellis Street, Newton, MA 02464',
    '2026-06-29T09:00:00-04:00',
    '2026-06-29T11:00:00-04:00',
    true,
    'liturgical'
  ),
  (
    'a0000000-0000-0000-0000-000000000014',
    'Transfiguration',
    'transfiguration',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Feast of the Transfiguration of our Lord."}]}]}',
    '73 Ellis Street, Newton, MA 02464',
    '2026-08-05T09:00:00-04:00',
    '2026-08-05T11:00:00-04:00',
    true,
    'liturgical'
  ),
  (
    'a0000000-0000-0000-0000-000000000015',
    'Assumption of the Blessed Virgin Mary',
    'assumption',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Feast of the Assumption (Shoonoyo) of the Blessed Virgin Mary."}]}]}',
    '73 Ellis Street, Newton, MA 02464',
    '2026-08-15T09:00:00-04:00',
    '2026-08-15T11:00:00-04:00',
    true,
    'liturgical'
  ),
  (
    'a0000000-0000-0000-0000-000000000016',
    'Nativity of the Blessed Virgin Mary',
    'nativity-of-blessed-virgin-mary',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Feast of the Nativity of the Blessed Virgin Mary."}]}]}',
    '73 Ellis Street, Newton, MA 02464',
    '2026-09-08T09:00:00-04:00',
    '2026-09-08T11:00:00-04:00',
    true,
    'liturgical'
  ),
  (
    'a0000000-0000-0000-0000-000000000017',
    'Christmas',
    'christmas',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Feast of the Nativity of our Lord Jesus Christ."}]}]}',
    '73 Ellis Street, Newton, MA 02464',
    '2025-12-25T09:00:00-05:00',
    '2025-12-25T11:00:00-05:00',
    true,
    'liturgical'
  );

-- Recurrence rules for annual feasts
INSERT INTO public.recurrence_rules (event_id, rrule_string, dtstart, until)
VALUES
  ('a0000000-0000-0000-0000-000000000010', 'FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=1', '2026-01-01T09:00:00-05:00', NULL),
  ('a0000000-0000-0000-0000-000000000011', 'FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=6', '2026-01-06T09:00:00-05:00', NULL),
  ('a0000000-0000-0000-0000-000000000012', 'FREQ=YEARLY;BYMONTH=3;BYMONTHDAY=25', '2026-03-25T09:00:00-04:00', NULL),
  ('a0000000-0000-0000-0000-000000000013', 'FREQ=YEARLY;BYMONTH=6;BYMONTHDAY=29', '2026-06-29T09:00:00-04:00', NULL),
  ('a0000000-0000-0000-0000-000000000014', 'FREQ=YEARLY;BYMONTH=8;BYMONTHDAY=5', '2026-08-05T09:00:00-04:00', NULL),
  ('a0000000-0000-0000-0000-000000000015', 'FREQ=YEARLY;BYMONTH=8;BYMONTHDAY=15', '2026-08-15T09:00:00-04:00', NULL),
  ('a0000000-0000-0000-0000-000000000016', 'FREQ=YEARLY;BYMONTH=9;BYMONTHDAY=8', '2026-09-08T09:00:00-04:00', NULL),
  ('a0000000-0000-0000-0000-000000000017', 'FREQ=YEARLY;BYMONTH=12;BYMONTHDAY=25', '2025-12-25T09:00:00-05:00', NULL);

-- ============================================================
-- Non-recurring Liturgical Events (moveable feasts / specific dates)
-- ============================================================

INSERT INTO public.events (title, slug, description, location, start_at, end_at, is_recurring, category)
VALUES
  (
    'Nativity Lent',
    'nativity-lent-2025',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Nativity Lent — 10-day fast in preparation for Christmas."}]}]}',
    '73 Ellis Street, Newton, MA 02464',
    '2025-12-15T00:00:00-05:00',
    '2025-12-24T23:59:59-05:00',
    false,
    'liturgical'
  ),
  (
    'Great Lent',
    'great-lent-2026',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Great Lenten season — 48-day period of fasting and prayer."}]}]}',
    '73 Ellis Street, Newton, MA 02464',
    '2026-02-16T00:00:00-05:00',
    '2026-04-04T23:59:59-04:00',
    false,
    'liturgical'
  ),
  (
    'Palm Sunday',
    'palm-sunday-2026',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hosanna Sunday — Triumphal entry of our Lord into Jerusalem."}]}]}',
    '73 Ellis Street, Newton, MA 02464',
    '2026-03-29T08:30:00-04:00',
    '2026-03-29T11:00:00-04:00',
    false,
    'liturgical'
  ),
  (
    'Holy Thursday',
    'holy-thursday-2026',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Pesaha (Passover) Thursday — Institution of the Holy Eucharist."}]}]}',
    '73 Ellis Street, Newton, MA 02464',
    '2026-04-02T18:00:00-04:00',
    '2026-04-02T20:00:00-04:00',
    false,
    'liturgical'
  ),
  (
    'Good Friday',
    'good-friday-2026',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Great Friday — Commemoration of the Crucifixion and Burial of our Lord."}]}]}',
    '73 Ellis Street, Newton, MA 02464',
    '2026-04-03T09:00:00-04:00',
    '2026-04-03T15:00:00-04:00',
    false,
    'liturgical'
  ),
  (
    'Holy Saturday',
    'holy-saturday-2026',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Holy Saturday — Vigil of the Resurrection."}]}]}',
    '73 Ellis Street, Newton, MA 02464',
    '2026-04-04T20:00:00-04:00',
    '2026-04-04T23:59:59-04:00',
    false,
    'liturgical'
  ),
  (
    'Easter',
    'easter-2026',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Feast of the Resurrection of our Lord Jesus Christ."}]}]}',
    '73 Ellis Street, Newton, MA 02464',
    '2026-04-05T08:30:00-04:00',
    '2026-04-05T12:00:00-04:00',
    false,
    'liturgical'
  ),
  (
    'Ascension',
    'ascension-2026',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Feast of the Ascension of our Lord."}]}]}',
    '73 Ellis Street, Newton, MA 02464',
    '2026-05-14T09:00:00-04:00',
    '2026-05-14T11:00:00-04:00',
    false,
    'liturgical'
  ),
  (
    'Pentecost',
    'pentecost-2026',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Feast of Pentecost — Descent of the Holy Spirit."}]}]}',
    '73 Ellis Street, Newton, MA 02464',
    '2026-05-24T08:30:00-04:00',
    '2026-05-24T11:00:00-04:00',
    false,
    'liturgical'
  );

-- ============================================================
-- Community Events
-- ============================================================

INSERT INTO public.events (title, slug, description, location, start_at, end_at, is_recurring, category)
VALUES
  (
    'Church Perunnal',
    'church-perunnal-2025',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Annual Church Feast (Perunnal) celebration."}]}]}',
    '73 Ellis Street, Newton, MA 02464',
    '2025-09-27T09:00:00-04:00',
    '2025-09-28T17:00:00-04:00',
    false,
    'community'
  );
