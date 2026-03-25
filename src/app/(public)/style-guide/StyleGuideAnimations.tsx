'use client'

import { Card, ScrollReveal, ScrollRevealGroup } from '@/components/ui'

export function StyleGuideAnimations() {
  return (
    <div className="mt-12 space-y-12">
      <div>
        <p className="mb-4 text-sm text-wood-800/60">Individual — up, down, left, right</p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <ScrollReveal direction="up">
            <Card variant="outlined">
              <Card.Body><p className="text-center">Up</p></Card.Body>
            </Card>
          </ScrollReveal>
          <ScrollReveal direction="down">
            <Card variant="outlined">
              <Card.Body><p className="text-center">Down</p></Card.Body>
            </Card>
          </ScrollReveal>
          <ScrollReveal direction="left">
            <Card variant="outlined">
              <Card.Body><p className="text-center">Left</p></Card.Body>
            </Card>
          </ScrollReveal>
          <ScrollReveal direction="right">
            <Card variant="outlined">
              <Card.Body><p className="text-center">Right</p></Card.Body>
            </Card>
          </ScrollReveal>
        </div>
      </div>

      <div>
        <p className="mb-4 text-sm text-wood-800/60">Staggered group</p>
        <ScrollRevealGroup direction="up" stagger={0.12} className="grid gap-6 sm:grid-cols-3">
          <Card>
            <Card.Body><p className="text-center">First</p></Card.Body>
          </Card>
          <Card>
            <Card.Body><p className="text-center">Second</p></Card.Body>
          </Card>
          <Card>
            <Card.Body><p className="text-center">Third</p></Card.Body>
          </Card>
        </ScrollRevealGroup>
      </div>
    </div>
  )
}
