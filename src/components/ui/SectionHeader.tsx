import { cn } from '@/lib/utils'

import { GoldDivider } from '@/components/ui/GoldDivider'

interface SectionHeaderProps {
  title: string
  subtitle?: string
  centered?: boolean
  className?: string
}

export function SectionHeader({
  title,
  subtitle,
  centered = true,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn(centered && 'text-center', className)}>
      <h2 className="font-heading text-[1.75rem] font-semibold text-wood-900 md:text-4xl">
        {title}
      </h2>
      <div className="mt-4">
        <GoldDivider />
      </div>
      {subtitle && (
        <p className="mx-auto mt-4 max-w-2xl text-wood-800/60">{subtitle}</p>
      )}
    </div>
  )
}
