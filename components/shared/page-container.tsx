import { cn } from '@/lib/utils'

/**
 * Consistent content wrapper used beneath the sticky DashboardHeader on every
 * page. Keeps padding and vertical rhythm identical across the app:
 * Page Header -> Action Bar -> Content Cards -> Tables/Charts/Forms -> footer spacing.
 */
export function PageContainer({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex-1 space-y-6 p-5 pb-16 md:space-y-8 md:p-8', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function SectionHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="min-w-0">
        <h2 className="text-section-title text-foreground">{title}</h2>
        {description && <p className="text-body mt-0.5 text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

export function ActionBar({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      {children}
    </div>
  )
}
