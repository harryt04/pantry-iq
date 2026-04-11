'use client'

import { BetaNotice } from '@/components/auth/beta-notice'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="from-background to-muted flex min-h-screen items-center justify-center bg-gradient-to-br p-4">
      <BetaNotice />
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}
