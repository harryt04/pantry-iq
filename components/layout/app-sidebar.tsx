'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  ChefHat,
  LayoutDashboard,
  Upload,
  MessageSquare,
  Settings,
  LogOut,
} from 'lucide-react'

export function AppSidebar() {
  const pathname = usePathname()

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/import', icon: Upload, label: 'Import Data' },
    { href: '/conversations', icon: MessageSquare, label: 'Conversations' },
    { href: '/settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <div className="border-border bg-background flex h-screen flex-col border-r">
      {/* Logo */}
      <div className="border-border flex items-center gap-2 border-b p-4">
        <ChefHat className="text-primary h-6 w-6" />
        <span className="font-bold">PantryIQ</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 p-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="border-border border-t p-4">
        <Button variant="outline" className="w-full justify-start gap-2">
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  )
}
