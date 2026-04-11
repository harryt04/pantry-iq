'use client'

import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  ArrowRight,
  Upload as UploadIcon,
  MessageSquare,
  Settings as SettingsIcon,
} from 'lucide-react'

interface QuickActionsCardProps {
  hasLocations: boolean
}

export function QuickActionsCard({ hasLocations }: QuickActionsCardProps) {
  const actions = [
    {
      label: 'Import Data',
      description: 'Upload CSV or connect POS',
      href: hasLocations ? '/import' : '/settings',
      icon: UploadIcon,
    },
    {
      label: 'Start Conversation',
      description: 'Ask AI about your data',
      href: '/conversations',
      icon: MessageSquare,
      disabled: !hasLocations,
    },
    {
      label: 'Manage Settings',
      description: 'Add locations and account',
      href: '/settings',
      icon: SettingsIcon,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {actions.map((action) => {
            const Icon = action.icon
            const content = (
              <div className="flex h-full flex-col justify-between">
                <div className="flex items-start gap-3">
                  <Icon
                    className={`mt-0.5 h-4 w-4 shrink-0 ${
                      action.disabled ? 'text-muted-foreground' : 'text-primary'
                    }`}
                  />
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
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3">
                  {action.disabled && (
                    <p className="text-muted-foreground text-xs">
                      Create a location first
                    </p>
                  )}
                  {!action.disabled && (
                    <ArrowRight className="text-primary ml-auto h-4 w-4 transition-transform group-hover:translate-x-1" />
                  )}
                </div>
              </div>
            )

            if (action.disabled) {
              return (
                <div
                  key={action.label}
                  className="group border-muted-foreground/20 bg-muted/50 text-muted-foreground rounded-lg border p-4"
                >
                  {content}
                </div>
              )
            }

            return (
              <Link
                key={action.label}
                href={action.href}
                className="group border-input bg-card hover:border-primary/50 hover:bg-primary/5 rounded-lg border p-4 transition-all hover:shadow-sm"
              >
                {content}
              </Link>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
