import type { Metadata } from 'next'

import {
  Button,
  Card,
  GoldDivider,
  PageHero,
  ScrollReveal,
  SectionHeader,
} from '@/components/ui'

export const metadata: Metadata = {
  title: 'Component Showcase',
  description: 'Dev-only showcase of all UI component variants.',
  robots: { index: false, follow: false },
}

export default function ShowcasePage() {
  return (
    <main>
      {/* PageHero */}
      <PageHero
        title="Component Showcase"
        imageSrc="/placeholder-hero.jpg"
        imageAlt="Showcase hero"
      />

      {/* Button Variants */}
      <section className="py-22">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="Button"
            subtitle="Three variants (primary, secondary, ghost) across three sizes (sm, md, lg)."
          />
          <div className="space-y-8">
            {(['primary', 'secondary', 'ghost'] as const).map((variant) => (
              <div key={variant} className="space-y-3">
                <h3 className="font-heading text-xl font-semibold capitalize text-wood-900">
                  {variant}
                </h3>
                <div className="flex flex-wrap items-center gap-4">
                  <Button variant={variant} size="sm">Small</Button>
                  <Button variant={variant} size="md">Medium</Button>
                  <Button variant={variant} size="lg">Large</Button>
                  <Button variant={variant} disabled>Disabled</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GoldDivider */}
      <section className="bg-sand py-22">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <SectionHeader title="GoldDivider" subtitle="A decorative gradient separator." />
          <div className="space-y-8">
            <GoldDivider />
            <GoldDivider className="max-w-[400px]" />
            <GoldDivider className="mx-0 max-w-[100px]" />
          </div>
        </div>
      </section>

      {/* Card Variants */}
      <section className="py-22">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="Card"
            subtitle="Three variants (default, dark, outlined) with compound sub-components."
          />
          <div className="grid gap-8 md:grid-cols-3">
            {(['default', 'dark', 'outlined'] as const).map((variant) => (
              <Card key={variant} variant={variant}>
                <Card.Header>
                  <h3 className="font-heading text-xl font-semibold capitalize">
                    {variant}
                  </h3>
                </Card.Header>
                <Card.Body>
                  <p className="text-sm leading-relaxed opacity-80">
                    This is a {variant} card with Header, Body, and Footer sub-components.
                  </p>
                </Card.Body>
                <Card.Footer>
                  <p className="text-xs opacity-60">Card footer content</p>
                </Card.Footer>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* SectionHeader */}
      <section className="bg-sand py-22">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="SectionHeader"
            subtitle="Center-aligned (default) with GoldDivider between title and subtitle."
          />
          <div className="mt-16">
            <SectionHeader
              title="Left-Aligned Variant"
              subtitle="Pass align='left' for left-aligned headers."
              align="left"
            />
          </div>
        </div>
      </section>

      {/* ScrollReveal */}
      <section className="py-22">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="ScrollReveal"
            subtitle="Scroll-triggered spring animations from four directions. Respects prefers-reduced-motion."
          />
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {(['up', 'down', 'left', 'right'] as const).map(
              (direction, i) => (
                <ScrollReveal
                  key={direction}
                  direction={direction}
                  delay={i * 0.12}
                >
                  <Card variant="outlined">
                    <Card.Body>
                      <p className="text-center font-medium capitalize">
                        {direction}
                      </p>
                    </Card.Body>
                  </Card>
                </ScrollReveal>
              ),
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
