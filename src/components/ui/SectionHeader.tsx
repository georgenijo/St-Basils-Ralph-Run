import { cn } from '@/lib/utils'

import { GoldDivider } from './GoldDivider'

interface SectionHeaderProps {
  title: string
  subtitle?: string
  align?: 'left' | 'center'
  className?: string
}

export function SectionHeader({
  title,
  subtitle,
  align = 'center',
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'mb-12',
        align === 'center' && 'text-center',
        className,
      )}
    >
      <h2 className="font-heading text-[1.75rem] font-semibold text-wood-900 md:text-[2.25rem] leading-[1.3]">
        {title}
      </h2>
      <GoldDivider className={cn('my-4', align === 'left' && 'mx-0')} />
      {subtitle && (
        <p className="max-w-2xl text-wood-800/60 mx-auto text-base leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  )
}
