'use client'

import { motion, useReducedMotion } from 'framer-motion'

import { cn } from '@/lib/utils'

type Direction = 'up' | 'down' | 'left' | 'right'

interface ScrollRevealProps {
  children: React.ReactNode
  direction?: Direction
  delay?: number
  className?: string
  as?: keyof typeof motion
}

const offsets: Record<Direction, { x?: number; y?: number }> = {
  up: { y: 40 },
  down: { y: -40 },
  left: { x: 40 },
  right: { x: -40 },
}

export function ScrollReveal({
  children,
  direction = 'up',
  delay = 0,
  className,
  as = 'div',
}: ScrollRevealProps) {
  const prefersReducedMotion = useReducedMotion()
  const Component = motion[as] as typeof motion.div

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>
  }

  const offset = offsets[direction]

  return (
    <Component
      initial={{ opacity: 0, ...offset }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 20,
        delay,
      }}
      className={cn(className)}
    >
      {children}
    </Component>
  )
}
