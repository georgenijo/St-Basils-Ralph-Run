import { Metadata } from 'next'
import Image from 'next/image'

import { Button, Card, GoldDivider, SectionHeader, ScrollReveal } from '@/components/ui'

export const metadata: Metadata = {
  title: 'Home',
  description:
    "Welcome to St. Basil's Syriac Orthodox Church in Boston, Massachusetts. Serving the Jacobite Malayalee community in the New England region since 1993.",
}

export default function HomePage() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative flex h-[60vh] items-center justify-center overflow-hidden md:h-screen">
        <Image
          src="/images/hero-church.jpg"
          alt="St. Basil's Syriac Orthodox Church exterior"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" aria-hidden="true" />

        <div className="relative z-10 px-4 text-center">
          <h1 className="animate-drop-in font-heading text-[2.5rem] font-light leading-[1.1] text-cream-50 md:text-[4.5rem]">
            St. Basil&#39;s Syriac
            <br />
            Orthodox Church
          </h1>
          <p className="mt-4 animate-drop-in font-body text-lg text-cream-50/80 md:text-xl">
            Serving the Jacobite Malayalee community in New England
          </p>
        </div>

        {/* Scroll chevron */}
        <a
          href="#service-times"
          aria-label="Scroll to service times"
          className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 animate-bounce"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-cream-50/70"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </a>
      </section>

      {/* ── Service Times Bar ── */}
      <section
        id="service-times"
        className="bg-burgundy-700 py-6 text-cream-50"
      >
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-6 px-4 sm:px-6 md:flex-row lg:px-8">
          <div className="flex items-center gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
              aria-hidden="true"
            >
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <address className="not-italic">73 Ellis Street, Newton, MA 02464</address>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-cream-50/70">
                Morning Prayer
              </p>
              <p className="text-lg font-medium">8:30 AM</p>
            </div>
            <div
              className="h-8 w-px bg-cream-50/30"
              role="separator"
              aria-hidden="true"
            />
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-cream-50/70">
                Holy Qurbono
              </p>
              <p className="text-lg font-medium">9:15 AM</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
              aria-hidden="true"
            >
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
              <line x1="16" x2="16" y1="2" y2="6" />
              <line x1="8" x2="8" y1="2" y2="6" />
              <line x1="3" x2="21" y1="10" y2="10" />
            </svg>
            <span>Sundays</span>
          </div>
        </div>
      </section>

      {/* ── Announcements (Static Placeholder) ── */}
      <section className="py-16 md:py-22 lg:py-28">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <SectionHeader
              title="Announcements"
              subtitle="Stay up to date with the latest from our parish"
            />
          </ScrollReveal>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {PLACEHOLDER_ANNOUNCEMENTS.map((item, i) => (
              <ScrollReveal key={item.title} delay={i * 0.12}>
                <Card variant="outlined" className="h-full">
                  <Card.Body>
                    <p className="text-xs font-medium uppercase tracking-wider text-wood-800/50">
                      {item.date}
                    </p>
                    <h3 className="mt-2 font-heading text-xl font-semibold text-wood-900">
                      {item.title}
                    </h3>
                    <p className="mt-2 leading-relaxed text-wood-800/70">{item.excerpt}</p>
                  </Card.Body>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Welcome Section ── */}
      <section className="bg-sand py-16 md:py-22 lg:py-28">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <ScrollReveal direction="left">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
                <Image
                  src="/images/church-interior.jpg"
                  alt="Interior of St. Basil's Syriac Orthodox Church during service"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </ScrollReveal>

            <ScrollReveal direction="right">
              <SectionHeader
                title="Welcome to St. Basil's"
                subtitle="A spiritual home in Boston"
                align="left"
              />
              <div className="mt-6 space-y-4 leading-relaxed text-wood-800">
                <p>
                  St. Basil&#39;s Syriac Orthodox Church has been a spiritual home for the Jacobite
                  Malayalee community in the New England region. Rooted in the ancient Syriac
                  tradition, our parish gathers every Sunday for the Holy Qurbono, carrying forward a
                  liturgical heritage that stretches back to the earliest days of Christianity.
                </p>
                <p>
                  Whether you are a lifelong member of the Syriac Orthodox faith or visiting for the
                  first time, you are warmly welcome to join us in worship, fellowship, and service.
                </p>
              </div>
              <div className="mt-8">
                <Button href="/about" variant="secondary">
                  Learn Our History
                </Button>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── Events CTA (Static Placeholder) ── */}
      <section className="py-16 md:py-22 lg:py-28">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <SectionHeader
              title="Upcoming Events"
              subtitle="Join us for worship, fellowship, and celebration"
            />
          </ScrollReveal>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {PLACEHOLDER_EVENTS.map((event, i) => (
              <ScrollReveal key={event.title} delay={i * 0.12}>
                <Card className="h-full">
                  <Card.Body>
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-burgundy-700 text-cream-50">
                        <span className="text-xs font-medium uppercase leading-none">
                          {event.month}
                        </span>
                        <span className="text-lg font-semibold leading-tight">{event.day}</span>
                      </div>
                      <div>
                        <h3 className="font-heading text-lg font-semibold text-wood-900">
                          {event.title}
                        </h3>
                        <p className="text-sm text-wood-800/60">{event.time}</p>
                      </div>
                    </div>
                    <p className="mt-4 leading-relaxed text-wood-800/70">{event.description}</p>
                  </Card.Body>
                </Card>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal className="mt-10 text-center">
            <Button href="/events-calendar" variant="primary">
              View All Events
            </Button>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Office Bearers CTA ── */}
      <section className="bg-charcoal py-16 md:py-22 lg:py-28">
        <div className="mx-auto max-w-[1200px] px-4 text-center sm:px-6 lg:px-8">
          <ScrollReveal>
            <h2 className="font-heading text-[1.75rem] font-semibold text-cream-50 md:text-[2.25rem]">
              Meet Our Leadership
            </h2>
            <GoldDivider className="my-4" />
            <p className="mx-auto max-w-2xl font-body text-base leading-relaxed text-cream-50/70">
              Our dedicated office bearers guide the parish with faith and service. Get to know the
              people who help our community thrive.
            </p>
            <div className="mt-8">
              <Button href="/office-bearers" variant="secondary" className="border-cream-50 text-cream-50 hover:bg-cream-50 hover:text-charcoal">
                View Office Bearers
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  )
}

/* ── Static placeholder data ── */

const PLACEHOLDER_ANNOUNCEMENTS = [
  {
    date: 'March 23, 2026',
    title: 'Great Lent Services',
    excerpt:
      'Evening prayers will be held every Wednesday and Friday during the Great Lent season. All parishioners are welcome.',
  },
  {
    date: 'March 15, 2026',
    title: 'Sunday School Registration',
    excerpt:
      'Registration for the 2026 Sunday School year is now open. Please contact the office for enrollment details.',
  },
  {
    date: 'March 8, 2026',
    title: 'Parish General Body Meeting',
    excerpt:
      'The annual general body meeting will be held following the Holy Qurbono. All members are encouraged to attend.',
  },
]

const PLACEHOLDER_EVENTS = [
  {
    month: 'APR',
    day: '5',
    title: 'Palm Sunday',
    time: '8:30 AM',
    description:
      'Join us for the commemoration of our Lord\'s triumphal entry into Jerusalem with special prayers and procession.',
  },
  {
    month: 'APR',
    day: '10',
    title: 'Good Friday',
    time: '9:00 AM',
    description:
      'Solemn service commemorating the crucifixion of our Lord. Evening prayers at 6:00 PM.',
  },
  {
    month: 'APR',
    day: '12',
    title: 'Easter Sunday',
    time: '8:30 AM',
    description:
      'Celebrate the glorious resurrection of our Lord Jesus Christ. Festive Qurbono followed by fellowship.',
  },
]
