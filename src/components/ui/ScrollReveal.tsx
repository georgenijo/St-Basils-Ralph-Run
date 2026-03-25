'use client'

import { useReducedMotion } from 'framer-motion'
import { motion } from 'framer-motion'

import { cn } from '@/lib/utils'

type Direction = 'up' | 'down' | 'left' | 'right'

export interface ScrollRevealProps {
  children: React.ReactNode
  direction?: Direction
  delay?: number
  once?: boolean
  stagger?: number
  className?: string
}

const offsets: Record<Direction, { x?: number; y?: number }> = {
  up: { y: 40 },
  down: { y: -40 },
  left: { x: 40 },
  right: { x: -40 },
}

/**
 * Scroll-triggered reveal animation wrapper.
 *
 * Use standalone for single-element reveals, or wrap `ScrollRevealItem`
 * children to stagger them into view.
 */
export function ScrollReveal({
  children,
  direction = 'up',
  delay = 0,
  once = true,
  stagger = 0.12,
  className,
}: ScrollRevealProps) {
  const prefersReducedMotion = useReducedMotion()
  const offset = offsets[direction]

  if (prefersReducedMotion) {
    return <div className={cn(className)}>{children}</div>
  }

  return (
    <motion.div
      className={cn(className)}
      variants={{
        hidden: { opacity: 0, ...offset },
        visible: {
          opacity: 1,
          x: 0,
          y: 0,
          transition: {
            type: 'spring',
            stiffness: 200,
            damping: 20,
            delay,
            staggerChildren: stagger,
          },
        },
      }}
      initial="hidden"
      whileInView="visible"
      viewport={{ once }}
    >
      {children}
    </motion.div>
  )
}

export interface ScrollRevealItemProps {
  children: React.ReactNode
  className?: string
}

/**
 * Child item that inherits stagger timing from a parent `ScrollReveal`.
 * Does not set its own `initial`/`whileInView` — the parent orchestrates.
 */
export function ScrollRevealItem({ children, className }: ScrollRevealItemProps) {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    return <div className={cn(className)}>{children}</div>
  }

  return (
    <motion.div
      className={cn(className)}
      variants={{
        hidden: { opacity: 0, y: 40 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            type: 'spring',
            stiffness: 200,
            damping: 20,
          },
        },
      }}
    >
      {children}
    </motion.div>
  )
}
