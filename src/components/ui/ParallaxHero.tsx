'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { motion, useScroll, useTransform } from 'framer-motion'

import { cn } from '@/lib/utils'

export interface ParallaxHeroProps {
  title: string
  backgroundImage: string
  className?: string
}

export function ParallaxHero({ title, backgroundImage, className }: ParallaxHeroProps) {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '30%'])

  return (
    <section
      ref={ref}
      className={cn(
        'relative flex h-[40vh] items-center justify-center overflow-hidden md:h-[60vh]',
        className
      )}
    >
      <motion.div className="absolute inset-[-10%]" style={{ y }}>
        <Image
          src={backgroundImage}
          alt=""
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
      </motion.div>

      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />

      <h1 className="relative z-10 animate-drop-in px-4 text-center font-heading text-[2.5rem] font-light leading-[1.1] text-cream-50 md:text-[4rem]">
        {title}
      </h1>
    </section>
  )
}
