import { Metadata } from 'next'

import { Button, Card, GoldDivider, SectionHeader } from '@/components/ui'

export const metadata: Metadata = {
  title: 'Component Showcase',
  description: 'Development-only showcase of all UI components and their variants.',
  robots: { index: false, follow: false },
}

export default function ShowcasePage() {
  return (
    <main className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-heading text-5xl font-semibold text-wood-900">
        Component Showcase
      </h1>
      <p className="mt-2 text-wood-800/60">
        All UI components and their variants. Dev-only — not indexed.
      </p>

      <hr className="my-12 border-wood-800/10" />

      {/* GoldDivider */}
      <section className="space-y-4">
        <h2 className="font-heading text-2xl font-semibold text-wood-900">
          GoldDivider
        </h2>
        <GoldDivider />
        <GoldDivider className="max-w-[100px]" />
        <GoldDivider className="max-w-[300px]" />
      </section>

      <hr className="my-12 border-wood-800/10" />

      {/* Button */}
      <section className="space-y-6">
        <h2 className="font-heading text-2xl font-semibold text-wood-900">
          Button
        </h2>

        <div>
          <h3 className="mb-3 font-heading text-lg font-semibold text-wood-900">
            Variants
          </h3>
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
          </div>
        </div>

        <div>
          <h3 className="mb-3 font-heading text-lg font-semibold text-wood-900">
            Sizes
          </h3>
          <div className="flex flex-wrap items-center gap-4">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
        </div>

        <div>
          <h3 className="mb-3 font-heading text-lg font-semibold text-wood-900">
            States
          </h3>
          <div className="flex flex-wrap items-center gap-4">
            <Button disabled>Disabled</Button>
            <Button href="/dev/showcase">As Link</Button>
          </div>
        </div>
      </section>

      <hr className="my-12 border-wood-800/10" />

      {/* Card */}
      <section className="space-y-6">
        <h2 className="font-heading text-2xl font-semibold text-wood-900">
          Card
        </h2>

        <div className="grid gap-6 md:grid-cols-3">
          <Card variant="default">
            <Card.Header>
              <h3 className="font-heading text-xl font-semibold">Default</h3>
            </Card.Header>
            <Card.Body>
              <p>Sand background with wood text. The standard card variant.</p>
            </Card.Body>
            <Card.Footer>
              <Button size="sm" variant="secondary">
                Action
              </Button>
            </Card.Footer>
          </Card>

          <Card variant="dark">
            <Card.Header>
              <h3 className="font-heading text-xl font-semibold text-cream-50">
                Dark
              </h3>
            </Card.Header>
            <Card.Body>
              <p>Charcoal background with cream text. For featured content.</p>
            </Card.Body>
            <Card.Footer>
              <Button size="sm">Action</Button>
            </Card.Footer>
          </Card>

          <Card variant="outlined">
            <Card.Header>
              <h3 className="font-heading text-xl font-semibold">Outlined</h3>
            </Card.Header>
            <Card.Body>
              <p>Cream background with subtle border. Light and airy.</p>
            </Card.Body>
            <Card.Footer>
              <Button size="sm" variant="ghost">
                Action
              </Button>
            </Card.Footer>
          </Card>
        </div>
      </section>

      <hr className="my-12 border-wood-800/10" />

      {/* SectionHeader */}
      <section className="space-y-8">
        <h2 className="font-heading text-2xl font-semibold text-wood-900">
          SectionHeader
        </h2>

        <SectionHeader title="Centered Header" subtitle="With a subtitle below the gold divider" />

        <SectionHeader
          title="Left-Aligned Header"
          subtitle="For asymmetric layouts"
          centered={false}
        />

        <SectionHeader title="Title Only" />
      </section>

      <hr className="my-12 border-wood-800/10" />

      {/* Color Palette */}
      <section className="space-y-6">
        <h2 className="font-heading text-2xl font-semibold text-wood-900">
          Color Palette
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          <div>
            <div className="h-20 rounded-xl bg-cream-50 ring-1 ring-wood-800/10" />
            <p className="mt-2 text-sm font-medium">cream-50</p>
            <p className="text-xs text-wood-800/60">#FFFDF8</p>
          </div>
          <div>
            <div className="h-20 rounded-xl bg-burgundy-700" />
            <p className="mt-2 text-sm font-medium">burgundy-700</p>
            <p className="text-xs text-wood-800/60">#9B1B3D</p>
          </div>
          <div>
            <div className="h-20 rounded-xl bg-gold-500" />
            <p className="mt-2 text-sm font-medium">gold-500</p>
            <p className="text-xs text-wood-800/60">#D4A017</p>
          </div>
          <div>
            <div className="h-20 rounded-xl bg-wood-800" />
            <p className="mt-2 text-sm font-medium">wood-800</p>
            <p className="text-xs text-wood-800/60">#4A3729</p>
          </div>
          <div>
            <div className="h-20 rounded-xl bg-charcoal" />
            <p className="mt-2 text-sm font-medium">charcoal</p>
            <p className="text-xs text-wood-800/60">#253341</p>
          </div>
          <div>
            <div className="h-20 rounded-xl bg-sand" />
            <p className="mt-2 text-sm font-medium">sand</p>
            <p className="text-xs text-wood-800/60">#FAEDCD</p>
          </div>
          <div>
            <div className="h-20 rounded-xl bg-wood-900" />
            <p className="mt-2 text-sm font-medium">wood-900</p>
            <p className="text-xs text-wood-800/60">#352618</p>
          </div>
          <div>
            <div className="h-20 rounded-xl bg-burgundy-800" />
            <p className="mt-2 text-sm font-medium">burgundy-800</p>
            <p className="text-xs text-wood-800/60">#7A1530</p>
          </div>
          <div>
            <div className="h-20 rounded-xl bg-cream-100" />
            <p className="mt-2 text-sm font-medium">cream-100</p>
            <p className="text-xs text-wood-800/60">#FFF9EF</p>
          </div>
          <div>
            <div className="h-20 rounded-xl bg-burgundy-100" />
            <p className="mt-2 text-sm font-medium">burgundy-100</p>
            <p className="text-xs text-wood-800/60">#F5E6EB</p>
          </div>
        </div>
      </section>

      <hr className="my-12 border-wood-800/10" />

      {/* Typography */}
      <section className="space-y-6">
        <h2 className="font-heading text-2xl font-semibold text-wood-900">
          Typography
        </h2>
        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-wood-800/60">
              Hero Title — Cormorant Garamond 300
            </p>
            <p className="font-heading text-[2.5rem] font-light leading-tight text-wood-900 md:text-[4rem]">
              The Light of the East
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-wood-800/60">
              Page Title (h1) — Cormorant Garamond 600
            </p>
            <p className="font-heading text-[2rem] font-semibold leading-snug text-wood-900 md:text-[3rem]">
              Our History
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-wood-800/60">
              Section Title (h2) — Cormorant Garamond 600
            </p>
            <p className="font-heading text-[1.75rem] font-semibold leading-snug text-wood-900 md:text-[2.25rem]">
              Upcoming Events
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-wood-800/60">
              Body — DM Sans 400
            </p>
            <p className="max-w-2xl leading-relaxed">
              St. Basil&apos;s Syriac Orthodox Church serves the Jacobite
              Malayalee community in the New England region, gathering each
              Sunday for the Holy Qurbono at 9:15 AM.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
