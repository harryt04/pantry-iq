'use client'

import { Button } from '@/components/ui/button'
import { Settings } from 'lucide-react'

export function AppHeader() {
  return (
    <div className="border-border bg-background flex items-center justify-between border-b px-6 py-4">
      <div>
        <p className="text-muted-foreground text-sm">Location</p>
        <p className="font-medium">Main Kitchen</p>
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
