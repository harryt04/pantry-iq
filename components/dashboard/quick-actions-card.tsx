'use client'

import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ArrowRight } from 'lucide-react'

interface QuickActionsCardProps {
  hasLocations: boolean
}

export function QuickActionsCard({ hasLocations }: QuickActionsCardProps) {
  const actions = [
    {
      label: 'Import Data',
      description: 'Upload CSV or connect POS',
      href: hasLocations ? '/import' : '/settings',
      icon: '📤',
    },
    {
      label: 'Start Conversation',
      description: 'Ask AI about your data',
      href: '/conversations',
      disabled: !hasLocations,
    },
    {
      label: 'Manage Settings',
      description: 'Add locations and account',
      href: '/settings',
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-3">
          {actions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className={`group rounded-lg border p-4 transition-colors ${
                action.disabled
                  ? 'border-muted-foreground/20 bg-muted/50 text-muted-foreground cursor-not-allowed'
                  : 'border-input bg-card hover:border-primary/50 hover:bg-primary/5'
              }`}
              onClick={(e) => {
                if (action.disabled) e.preventDefault()
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p
                    className={`font-semibold ${
                      action.disabled
                        ? 'text-muted-foreground'
                        : 'text-foreground'
                    }`}
                  >
                    {action.label}
                  </p>
                  <p
                    className={`mt-1 text-sm ${
                      action.disabled
                        ? 'text-muted-foreground/60'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {action.description}
                  </p>
                  {action.disabled && (
                    <p className="text-muted-foreground mt-2 text-xs">
                      Create a location first
                    </p>
                  )}
                </div>
                {!action.disabled && (
                  <ArrowRight className="text-primary mt-1 ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                )}
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
