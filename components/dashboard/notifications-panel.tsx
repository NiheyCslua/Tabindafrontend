'use client'

import { Bell, AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatRelativeTime } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import { useInventoryStore } from '@/lib/store/inventory-store'
import { useInvoiceStore } from '@/lib/store/invoice-store'
import { buildNotifications } from '@/lib/dashboard-derived'

const iconMap = {
  warning: AlertTriangle,
  success: CheckCircle,
  info: Info,
  error: XCircle
}

const colorMap = {
  warning: 'text-amber-500 bg-amber-500/10',
  success: 'text-emerald-500 bg-emerald-500/10',
  info: 'text-blue-500 bg-blue-500/10',
  error: 'text-red-500 bg-red-500/10'
}

export function NotificationsPanel() {
  const products = useInventoryStore((state) => state.products)
  const invoices = useInvoiceStore((state) => state.invoices)
  const notifications = buildNotifications(products, invoices)

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle className="text-foreground">Notifications</CardTitle>
            <CardDescription className="text-muted-foreground">
              Recent alerts and updates
            </CardDescription>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
          Mark all read
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {notifications.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No notifications yet.
          </div>
        ) : notifications.slice(0, 6).map((notification) => {
          const Icon = iconMap[notification.type]
          const colorClass = colorMap[notification.type]
          
          return (
            <div
              key={notification.id}
              className={cn(
                'flex gap-3 p-3 rounded-lg transition-colors cursor-pointer',
                notification.read ? 'bg-transparent hover:bg-muted/30' : 'bg-muted/40 hover:bg-muted/50'
              )}
            >
              <div className={cn('p-2 rounded-lg h-fit', colorClass)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={cn(
                    'font-medium text-sm',
                    notification.read ? 'text-muted-foreground' : 'text-foreground'
                  )}>
                    {notification.title}
                  </p>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatRelativeTime(notification.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {notification.message}
                </p>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
