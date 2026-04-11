'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { authClient } from '@/lib/auth-client'
import {
  Menu,
  Settings,
  ChefHat,
  LayoutDashboard,
  Upload,
  MessageSquare,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function AppHeader() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/import', icon: Upload, label: 'Import Data' },
    { href: '/conversations', icon: MessageSquare, label: 'Conversations' },
    { href: '/settings', icon: Settings, label: 'Settings' },
  ]

  const handleLogout = async () => {
    await authClient.signOut()
    setOpen(false)
  }

  return (
    <div className="border-border bg-background flex items-center justify-between border-b px-6 py-4">
      <div className="flex items-center gap-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-56 p-0">
            <div className="bg-sidebar border-border flex h-full w-full flex-col border-r">
              {/* Mobile Header */}
              <div className="border-border flex items-center gap-3 border-b px-4 py-4">
                <ChefHat className="text-primary h-6 w-6 flex-shrink-0" />
                <span className="text-lg font-bold">PantryIQ</span>
              </div>

              {/* Mobile Navigation */}
              <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
                {navItems.map((item) => {
                  const isActive = pathname === item.href
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
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

              {/* Mobile Footer */}
              <div className="border-border border-t px-2 py-4">
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
          </SheetContent>
        </Sheet>

        <div>
          <p className="text-muted-foreground text-sm">Location</p>
          <p className="font-medium">Main Kitchen</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium">Chef Manager</p>
          <p className="text-muted-foreground text-xs">chef@example.com</p>
        </div>
        <Button variant="ghost" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
