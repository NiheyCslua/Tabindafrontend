import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/utils/format'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: number
  change?: number
  changeLabel?: string
  icon: LucideIcon
  isCurrency?: boolean
  iconColor?: string
}

export function StatCard({
  title,
  value,
  change,
  changeLabel = 'vs last month',
  icon: Icon,
  isCurrency = false,
  iconColor = 'text-primary'
}: StatCardProps) {
  const isPositive = change !== undefined && change >= 0
  
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">
              {isCurrency ? formatCurrency(value) : formatNumber(value)}
            </p>
          </div>
          <div className={cn('p-2 rounded-lg bg-primary/10', iconColor.replace('text-', 'bg-').replace('500', '500/10'))}>
            <Icon className={cn('h-5 w-5', iconColor)} />
          </div>
        </div>
        
        {change !== undefined && (
          <div className="mt-4 flex items-center gap-2">
            <div className={cn(
              'flex items-center gap-1 text-sm font-medium',
              isPositive ? 'text-emerald-500' : 'text-red-500'
            )}>
              {isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>{formatPercentage(Math.abs(change))}</span>
            </div>
            <span className="text-sm text-muted-foreground">{changeLabel}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
