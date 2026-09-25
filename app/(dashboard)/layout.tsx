'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/dashboard/app-sidebar'
import { useAuthStore } from '@/lib/store/auth-store'
import { useTemplateStore } from '@/lib/store/template-store'
import { Loader2 } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { isAuthenticated, user, isLoading } = useAuthStore()
  const fetchTemplates = useTemplateStore((state) => state.fetchTemplates)

  useEffect(() => {
    // Wait for hydration before checking auth
    const timeout = setTimeout(() => {
      if (!isAuthenticated) {
        router.push('/login')
      }
    }, 100)
    
    return () => clearTimeout(timeout)
  }, [isAuthenticated, router])

  // Invoice Templates are DB-backed now (Terms & Conditions Persistence) —
  // load them once per session as soon as the user is in, so every invoice
  // page has the live server copy (not just Settings) instead of the
  // static fallback defaults.
  useEffect(() => {
    if (isAuthenticated) {
      fetchTemplates()
    }
  }, [isAuthenticated, fetchTemplates])
  
  // Show loading state while checking auth
  if (!isAuthenticated && !user) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
}

return (
  <div>
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {children}
      </SidebarInset>
    </SidebarProvider>
  </div>
)
}
