'use client'

import { useReducedMotion, motion } from 'framer-motion'

import type { ReactNode } from 'react'

const directionOffsets = {
  up: { y: 40 },
  down: { y: -40 },
  left: { x: 40 },
  right: { x: -40 },
} as const

type Direction = keyof typeof directionOffsets

export interface ScrollRevealProps {
  children: ReactNode
  direction?: Direction
  delay?: number
  once?: boolean
  className?: string
}

export function ScrollReveal({
  children,
  direction = 'up',
  delay = 0,
  once = true,
  className,
}: ScrollRevealProps) {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>
  }

  const offset = directionOffsets[direction]

  return (
    <motion.div
      initial={{ opacity: 0, ...offset }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 20,
        delay,
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export interface ScrollRevealGroupProps {
  children: ReactNode
  direction?: Direction
  stagger?: number
  once?: boolean
  className?: string
}

export function ScrollRevealGroup({
  children,
  direction = 'up',
  stagger = 0.12,
  once = true,
  className,
}: ScrollRevealGroupProps) {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>
  }

  const offset = directionOffsets[direction]

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: stagger,
          },
        },
      }}
      className={className}
    >
      {Array.isArray(children) ? (
        children.map((child, i) => (
          <motion.div
            key={i}
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
                },
              },
            }}
          >
            {child}
          </motion.div>
        ))
      ) : (
        <motion.div
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
              },
            },
          }}
        >
          {children}
        </motion.div>
      )}
    </motion.div>
  )
}
