'use client'
 
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Package,
  LayoutDashboard,
  PackageSearch,
  FileText,
  Users,
  UserCog,
  Settings,
  LogOut,
  ChevronUp,
  Truck,
  Receipt,
  ScanSearch,
  CreditCard,
  ArrowDownToLine,
  ListChecks,
  BookOpenText,
  BarChart3,
  BookOpenCheck,
  Landmark,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuthStore } from '@/lib/store/auth-store'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
 
// Nav item type — children renders as tree sub-items
interface NavItem {
  title: string
  url: string
  icon: React.ElementType
  children?: { title: string; url: string; icon: React.ElementType }[]
}
 
const adminNavItems: NavItem[] = [
  { title: 'Dashboard',  url: '/admin',            icon: LayoutDashboard },
  {
    title: 'Inventory',
    url: '/admin/inventory',
    icon: PackageSearch,
    children: [
      { title: 'Product Search', url: '/admin/inventory/search', icon: ScanSearch },
    ],
  },
  {
    title: 'Customers',
    url: '/admin/customers',
    icon: Users,
    children: [
      { title: 'Invoices', url: '/admin/invoices', icon: FileText },
    ],
  },
  {
    title: 'Vendors',
    url: '/admin/vendors',
    icon: Truck,
    children: [
      { title: 'Bills', url: '/admin/vendors/bills', icon: Receipt },
      { title: 'Pay Bills', url: '/admin/vendors/pay-bills', icon: CreditCard },
      { title: 'Receive Payments', url: '/admin/vendors/receive-payments', icon: ArrowDownToLine },
      { title: 'Vendor Payments', url: '/admin/vendors/payments', icon: ListChecks },
      { title: 'Vendor Ledger', url: '/admin/vendors/ledger', icon: BookOpenText },
    ],
  },
  { title: 'Employees',  url: '/admin/employees',  icon: UserCog },
  { title: 'Chart of Accounts', url: '/admin/accounts', icon: Landmark },
  // Earnings Report and Miscellaneous Ledger hidden from nav — pages still exist
  {
    title: 'Earnings Report',
    url: '/admin/ledger',
    icon: BookOpenCheck,
    children: [
      { title: 'Miscellaneous Ledger', url: '/admin/ledger/miscellaneous', icon: Receipt },
    ],
  },
  { title: 'Reports',    url: '/admin/reports',    icon: BarChart3 },
  { title: 'Settings',   url: '/admin/settings',   icon: Settings },
]
 
const employeeNavItems: NavItem[] = [
  { title: 'Dashboard', url: '/employee',           icon: LayoutDashboard },
  {
    title: 'Inventory',
    url: '/employee/inventory',
    icon: PackageSearch,
    children: [
      { title: 'Product Search', url: '/employee/inventory/search', icon: ScanSearch },
    ],
  },
  { title: 'Invoices',  url: '/employee/invoices',  icon: FileText },
]
 
const inventoryManagerNavItems: NavItem[] = [
  { title: 'Dashboard', url: '/inventory-manager',           icon: LayoutDashboard },
  {
    title: 'Products',
    url: '/inventory-manager/inventory',
    icon: PackageSearch,
    children: [
      { title: 'Product Search', url: '/inventory-manager/inventory/search', icon: ScanSearch },
    ],
  },
]
 
export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()
 
  const isAdmin = user?.role === 'admin'
  const isInventoryManager = user?.role === 'inventory_manager'
  const navItems = isAdmin
    ? adminNavItems
    : isInventoryManager
    ? inventoryManagerNavItems
    : employeeNavItems
 
  const handleLogout = () => {
    logout()
    router.push('/login')
  }
 
  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
 
  const homeUrl = isAdmin ? '/admin' : isInventoryManager ? '/inventory-manager' : '/employee'
  const portalLabel = isAdmin ? 'Admin Portal' : isInventoryManager ? 'Inventory Portal' : 'Sales Portal'
 
  const isItemActive = (url: string) =>
    pathname === url || (url !== homeUrl && pathname.startsWith(url))
 
  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <Link href={homeUrl} className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Package className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-sidebar-foreground">Tabinda Machinery</span>
            <span className="text-xs text-sidebar-foreground/60">{portalLabel}</span>
          </div>
        </Link>
      </SidebarHeader>
 
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-[10px] tracking-wider font-semibold">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const active = isItemActive(item.url)
                const childActive = item.children?.some(c => isItemActive(c.url))
 
                return (
                  <SidebarMenuItem key={item.title}>
                    {/* Parent row */}
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
 
                    {/* Tree children */}
                    {item.children && item.children.length > 0 && (
                      <div className="ml-4 mt-0.5 flex flex-col">
                        {item.children.map((child, idx) => {
                          const isLast = idx === item.children!.length - 1
                          const childIsActive = isItemActive(child.url)
 
                          return (
                            <div key={child.url} className="flex items-stretch">
                              {/* Tree line: vertical bar + elbow */}
                              <div className="flex flex-col items-center w-4 shrink-0 mr-1">
                                {/* vertical line — full height for non-last, half for last */}
                                <div
                                  className={cn(
                                    'w-px bg-sidebar-border',
                                    isLast ? 'h-3.5' : 'flex-1'
                                  )}
                                />
                                {/* elbow connector */}
                                <div className="w-2 h-px bg-sidebar-border mt-0" />
                                {/* continue line below elbow for non-last items */}
                                {!isLast && <div className="w-px bg-sidebar-border flex-1" />}
                              </div>
 
                              {/* Child link */}
                              <Link
                                href={child.url}
                                className={cn(
                                  'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm flex-1 my-0.5',
                                  'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors',
                                  childIsActive && 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                                )}
                              >
                                <child.icon className="h-3.5 w-3.5 shrink-0" />
                                <span>{child.title}</span>
                              </Link>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
 
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar} alt={user?.name} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {user?.name ? getInitials(user.name) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-left text-sm">
                    <span className="font-medium truncate max-w-[120px]">{user?.name}</span>
                    <span className="text-xs text-sidebar-foreground/60 truncate max-w-[120px]">
                      {user?.email}
                    </span>
                  </div>
                  <ChevronUp className="ml-auto h-4 w-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
                side="top"
                align="start"
                sideOffset={4}
              >
                <DropdownMenuItem className="gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar} alt={user?.name} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {user?.name ? getInitials(user.name) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{user?.name}</span>
                    <span className="text-xs text-muted-foreground">{user?.email}</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
