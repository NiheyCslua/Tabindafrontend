'use client'

import Link from 'next/link'
import { PackageSearch, FilePlus, FileText, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface QuickAction {
  title: string
  description: string
  icon: React.ElementType
  href: string
  color: string
}

interface QuickActionsProps {
  basePath: string
}

export function QuickActions({ basePath }: QuickActionsProps) {
  const actions: QuickAction[] = [
    {
      title: 'View Inventory',
      description: 'Browse and search products',
      icon: PackageSearch,
      href: `${basePath}/inventory`,
      color: 'text-blue-500'
    },
    {
      title: 'Create Invoice',
      description: 'Generate a new invoice',
      icon: FilePlus,
      href: `${basePath}/invoices/new`,
      color: 'text-emerald-500'
    },
    {
      title: 'View Invoices',
      description: 'Manage recent invoices',
      icon: FileText,
      href: `${basePath}/invoices`,
      color: 'text-purple-500'
    }
  ]
  
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Quick Actions</CardTitle>
        <CardDescription className="text-muted-foreground">
          Common tasks and shortcuts
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        {actions.map((action) => (
          <Link key={action.title} href={action.href}>
            <div className="group p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-all cursor-pointer border border-transparent hover:border-border">
              <div className={cn('p-2 rounded-lg bg-primary/10 w-fit mb-3', action.color.replace('text-', 'bg-').replace('500', '500/10'))}>
                <action.icon className={cn('h-5 w-5', action.color)} />
              </div>
              <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                {action.title}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {action.description}
              </p>
              <div className="mt-3 flex items-center gap-1 text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Go</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}
