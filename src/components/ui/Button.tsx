import Link from 'next/link'

import { cn } from '@/lib/utils'

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  href?: string
  children: React.ReactNode
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  onClick?: () => void
}

const variantStyles = {
  primary:
    'bg-burgundy-700 text-cream-50 hover:bg-burgundy-800 focus-visible:ring-burgundy-700',
  secondary:
    'border border-burgundy-700 text-burgundy-700 hover:bg-burgundy-700 hover:text-cream-50 focus-visible:ring-burgundy-700',
  ghost:
    'text-burgundy-700 hover:bg-cream-100 focus-visible:ring-burgundy-700',
}

const sizeStyles = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
}

export function Button({
  variant = 'primary',
  size = 'md',
  href,
  children,
  className,
  disabled,
  type = 'button',
  onClick,
}: ButtonProps) {
  const classes = cn(
    'inline-flex items-center justify-center rounded-lg font-body font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
    'min-h-11 min-w-11',
    variantStyles[variant],
    sizeStyles[size],
    className,
  )

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    )
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
