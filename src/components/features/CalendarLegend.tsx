interface CalendarLegendProps {
  variant?: 'admin' | 'public'
}

const ADMIN_ITEMS = [
  { tone: 'default', label: 'Recurring' },
  { tone: 'warn', label: 'Modified' },
  { tone: 'default', label: 'Cancelled' },
  { tone: 'ok', label: 'One-time' },
]

const PUBLIC_ITEMS = [
  { tone: 'warn', label: 'Modified' },
  { tone: 'default', label: 'Cancelled' },
]

export function CalendarLegend({ variant = 'admin' }: CalendarLegendProps) {
  const items = variant === 'admin' ? ADMIN_ITEMS : PUBLIC_ITEMS

  return (
    <div
      className={
        variant === 'admin'
          ? 'flex flex-wrap items-center gap-4'
          : 'flex flex-wrap items-center gap-4 rounded-lg bg-cream-100/50 px-4 py-2'
      }
    >
      <span className="font-body text-xs font-medium text-wood-800/60">Legend:</span>
      {items.map((item) =>
        variant === 'admin' ? (
          <span
            key={item.label}
            className={`admin-status ${item.tone === 'ok' ? 'admin-status-ok' : item.tone === 'warn' ? 'admin-status-warn' : ''}`}
          >
            {item.label}
          </span>
        ) : (
          <span key={item.label} className="inline-flex items-center gap-1.5">
            <span
              className={`h-3 w-3 rounded-full ${item.tone === 'warn' ? 'bg-amber-600' : 'bg-red-600'}`}
              aria-hidden="true"
            />
            <span className="font-body text-xs text-wood-800/80">{item.label}</span>
          </span>
        )
      )}
    </div>
  )
}
