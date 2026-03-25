import Image from 'next/image'

import { cn } from '@/lib/utils'

interface PageHeroProps {
  title: string
  imageSrc: string
  imageAlt: string
  className?: string
}

export function PageHero({ title, imageSrc, imageAlt, className }: PageHeroProps) {
  return (
    <section
      className={cn(
        'relative flex h-[40vh] items-center justify-center overflow-hidden md:h-[60vh]',
        className,
      )}
    >
      <Image
        src={imageSrc}
        alt={imageAlt}
        fill
        className="object-cover"
        priority
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-black/50" />
      <h1 className="relative z-10 px-4 text-center font-heading text-[2.5rem] font-light text-cream-50 md:text-[4rem]">
        {title}
      </h1>
    </section>
  )
}
