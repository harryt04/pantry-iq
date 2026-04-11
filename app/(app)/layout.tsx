'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AppHeader } from '@/components/layout/app-header'
import { useSession } from '@/lib/auth-client'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !isPending && !session) {
      router.push('/login')
    }
  }, [mounted, isPending, session, router])

  if (!mounted || isPending) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="flex h-screen">
      <div className="hidden w-64 md:block">
        <AppSidebar />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader />
        <main className="bg-muted/30 flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}
