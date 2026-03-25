'use client'

import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'

import { cn } from '@/lib/utils'

type Direction = 'up' | 'down' | 'left' | 'right'

export interface ScrollRevealProps {
  children: React.ReactNode
  direction?: Direction
  delay?: number
  stagger?: number
  className?: string
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
  stagger = 0.12,
  className,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const prefersReducedMotion = useReducedMotion()

  const offset = offsets[direction]

  if (prefersReducedMotion) {
    return (
      <div ref={ref} className={cn(className)}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, ...offset }}
      animate={isInView ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, ...offset }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 20,
        delay,
        staggerChildren: stagger,
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  )
}
