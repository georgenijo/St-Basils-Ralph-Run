import Image from 'next/image'

import { cn } from '@/lib/utils'

interface PageHeroProps {
  title: string
  backgroundImage: string
  className?: string
}

export function PageHero({ title, backgroundImage, className }: PageHeroProps) {
  return (
    <section
      className={cn(
        'relative flex h-[40vh] items-center justify-center overflow-hidden md:h-[60vh]',
        className
      )}
    >
      <Image
        src={backgroundImage}
        alt=""
        fill
        priority
        className="object-cover"
        sizes="100vw"
      />

      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />

      <h1 className="relative z-10 mx-auto max-w-[1200px] px-4 text-center font-heading text-[2.5rem] font-light leading-[1.1] text-cream-50 motion-safe:animate-drop-in sm:px-6 md:text-[4rem] lg:px-8">
        {title}
      </h1>
    </section>
  )
}
