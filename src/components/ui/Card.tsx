import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/*  Variant maps                                                       */
/* ------------------------------------------------------------------ */

const cardVariants = {
  default: 'bg-sand text-wood-800',
  dark: 'bg-charcoal text-cream-50',
  outlined: 'bg-cream-50 text-wood-800 border border-wood-800/10',
} as const

type CardVariant = keyof typeof cardVariants

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface CardProps {
  variant?: CardVariant
  children: React.ReactNode
  className?: string
}

interface CardSectionProps {
  children: React.ReactNode
  className?: string
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function CardHeader({ children, className }: CardSectionProps) {
  return <div className={cn('p-6 pb-0', className)}>{children}</div>
}

function CardBody({ children, className }: CardSectionProps) {
  return <div className={cn('p-6', className)}>{children}</div>
}

function CardFooter({ children, className }: CardSectionProps) {
  return <div className={cn('p-6 pt-0', className)}>{children}</div>
}

/* ------------------------------------------------------------------ */
/*  Card (root) + compound assignment                                  */
/* ------------------------------------------------------------------ */

function Card({ variant = 'default', children, className }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl shadow-sm',
        cardVariants[variant],
        className,
      )}
    >
      {children}
    </div>
  )
}

Card.Header = CardHeader
Card.Body = CardBody
Card.Footer = CardFooter

/* ------------------------------------------------------------------ */
/*  Export                                                             */
/* ------------------------------------------------------------------ */

export { Card }
export type { CardProps, CardSectionProps, CardVariant }
