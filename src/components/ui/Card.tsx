import { cn } from '@/lib/utils'

type CardVariant = 'default' | 'dark' | 'outlined'

interface CardProps {
  variant?: CardVariant
  children: React.ReactNode
  className?: string
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-sand text-wood-800',
  dark: 'bg-charcoal text-cream-50',
  outlined: 'bg-cream-50 text-wood-800 border border-wood-800/10',
}

function Card({ variant = 'default', children, className }: CardProps) {
  return (
    <div className={cn('rounded-2xl shadow-sm', variantStyles[variant], className)}>
      {children}
    </div>
  )
}

function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('p-6 pb-0', className)}>{children}</div>
}

function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('p-6', className)}>{children}</div>
}

function CardFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('p-6 pt-0', className)}>{children}</div>
}

Card.Header = CardHeader
Card.Body = CardBody
Card.Footer = CardFooter

export { Card }
export type { CardProps, CardVariant }
