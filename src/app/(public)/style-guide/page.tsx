import { Metadata } from 'next'

import {
  Button,
  Card,
  GoldDivider,
  PageHero,
  SectionHeader,
} from '@/components/ui'

import { StyleGuideAnimations } from './StyleGuideAnimations'

export const metadata: Metadata = {
  title: 'Style Guide',
  description: 'Component showcase and design system reference.',
  robots: { index: false, follow: false },
}

export default function StyleGuidePage() {
  return (
    <main>
      <PageHero
        title="Style Guide"
        backgroundImage="/images/placeholder-hero.jpg"
      />

      {/* GoldDivider */}
      <section className="py-16 md:py-22">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="GoldDivider"
            subtitle="A decorative horizontal rule with a gold gradient."
          />
          <div className="mt-12 space-y-8">
            <div className="space-y-2">
              <p className="text-sm text-wood-800/60">Default</p>
              <GoldDivider />
            </div>
            <div className="space-y-2">
              <p className="text-sm text-wood-800/60">Left-aligned, wider</p>
              <GoldDivider className="mx-0 max-w-sm" />
            </div>
          </div>
        </div>
      </section>

      {/* Button */}
      <section className="bg-sand py-16 md:py-22">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="Button"
            subtitle="Three variants (primary, secondary, ghost) in three sizes (sm, md, lg)."
          />
          <div className="mt-12 space-y-8">
            <div>
              <p className="mb-4 text-sm font-medium text-wood-800/60">Primary</p>
              <div className="flex flex-wrap items-center gap-4">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
                <Button disabled>Disabled</Button>
              </div>
            </div>
            <div>
              <p className="mb-4 text-sm font-medium text-wood-800/60">Secondary</p>
              <div className="flex flex-wrap items-center gap-4">
                <Button variant="secondary" size="sm">Small</Button>
                <Button variant="secondary" size="md">Medium</Button>
                <Button variant="secondary" size="lg">Large</Button>
                <Button variant="secondary" disabled>Disabled</Button>
              </div>
            </div>
            <div>
              <p className="mb-4 text-sm font-medium text-wood-800/60">Ghost</p>
              <div className="flex flex-wrap items-center gap-4">
                <Button variant="ghost" size="sm">Small</Button>
                <Button variant="ghost" size="md">Medium</Button>
                <Button variant="ghost" size="lg">Large</Button>
                <Button variant="ghost" disabled>Disabled</Button>
              </div>
            </div>
            <div>
              <p className="mb-4 text-sm font-medium text-wood-800/60">As Link</p>
              <Button href="/style-guide">Link Button</Button>
            </div>
          </div>
        </div>
      </section>

      {/* Card */}
      <section className="py-16 md:py-22">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="Card"
            subtitle="Compound component with Header, Body, and Footer. Three variants."
          />
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <Card>
              <Card.Header>
                <h3 className="font-heading text-xl font-semibold">Default</h3>
              </Card.Header>
              <Card.Body>
                <p>Sand background with wood text. Used for general content cards.</p>
              </Card.Body>
              <Card.Footer>
                <Button size="sm">Action</Button>
              </Card.Footer>
            </Card>

            <Card variant="dark">
              <Card.Header>
                <h3 className="font-heading text-xl font-semibold">Dark</h3>
              </Card.Header>
              <Card.Body>
                <p>Charcoal background with cream text. Used for featured content.</p>
              </Card.Body>
              <Card.Footer>
                <Button size="sm" variant="secondary" className="border-cream-50 text-cream-50 hover:bg-cream-50 hover:text-charcoal">Action</Button>
              </Card.Footer>
            </Card>

            <Card variant="outlined">
              <Card.Header>
                <h3 className="font-heading text-xl font-semibold">Outlined</h3>
              </Card.Header>
              <Card.Body>
                <p>Cream background with subtle border. Used for clean, minimal layouts.</p>
              </Card.Body>
              <Card.Footer>
                <Button size="sm" variant="ghost">Action</Button>
              </Card.Footer>
            </Card>
          </div>
        </div>
      </section>

      {/* SectionHeader */}
      <section className="bg-sand py-16 md:py-22">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="SectionHeader"
            subtitle="Title, gold divider, and optional subtitle. Supports h2/h3 and left/center alignment."
          />
          <div className="mt-12 space-y-12">
            <div className="rounded-2xl bg-cream-50 p-8">
              <p className="mb-4 text-sm text-wood-800/60">Centered h2 (default)</p>
              <SectionHeader
                title="Our History"
                subtitle="A community of faith since 1993."
              />
            </div>
            <div className="rounded-2xl bg-cream-50 p-8">
              <p className="mb-4 text-sm text-wood-800/60">Left-aligned h3</p>
              <SectionHeader
                as="h3"
                align="left"
                title="Sunday School"
                subtitle="Nurturing the next generation in faith."
              />
            </div>
          </div>
        </div>
      </section>

      {/* ScrollReveal */}
      <section className="py-16 md:py-22">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="ScrollReveal"
            subtitle="Spring-based scroll animations. Respects prefers-reduced-motion."
          />
          <StyleGuideAnimations />
        </div>
      </section>
    </main>
  )
}
