'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import {
  ChefHat,
  LayoutDashboard,
  Upload,
  MessageSquare,
  Settings,
  LogOut,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function AppSidebar() {
  const pathname = usePathname()

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/import', icon: Upload, label: 'Import Data' },
    { href: '/conversations', icon: MessageSquare, label: 'Conversations' },
    { href: '/settings', icon: Settings, label: 'Settings' },
  ]

  const handleLogout = async () => {
    await authClient.signOut()
  }

  return (
    <div className="bg-sidebar border-sidebar-border hidden h-screen w-56 flex-col border-r md:flex">
      {/* Header */}
      <div className="border-sidebar-border flex items-center gap-3 border-b px-4 py-4">
        <ChefHat className="text-primary h-6 w-6 flex-shrink-0" />
        <span className="text-lg font-bold">PantryIQ</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-sidebar-border border-t px-2 py-4">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  )
}
