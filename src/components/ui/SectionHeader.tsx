import { cn } from '@/lib/utils'

import { GoldDivider } from './GoldDivider'

type HeadingLevel = 'h2' | 'h3'

interface SectionHeaderProps {
  title: string
  subtitle?: string
  as?: HeadingLevel
  align?: 'left' | 'center'
  className?: string
}

export function SectionHeader({
  title,
  subtitle,
  as: Tag = 'h2',
  align = 'center',
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn('space-y-4', align === 'center' && 'text-center', className)}>
      <Tag
        className={cn(
          'font-heading font-semibold text-wood-900',
          Tag === 'h2' && 'text-[1.75rem] leading-[1.3] md:text-[2.25rem]',
          Tag === 'h3' && 'text-[1.25rem] leading-[1.4] md:text-[1.5rem]',
        )}
      >
        {title}
      </Tag>

      <GoldDivider className={align === 'left' ? 'mx-0' : undefined} />

      {subtitle && (
        <p className="mx-auto max-w-2xl text-wood-800/60">{subtitle}</p>
      )}
    </div>
  )
}
