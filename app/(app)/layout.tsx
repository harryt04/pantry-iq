'use client'

import { useRouter } from 'next/navigation'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AppHeader } from '@/components/layout/app-header'
import { useSession } from '@/lib/auth-client'
import { ZeroProvider } from '@/providers/zero-provider'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession()
  const router = useRouter()

  if (isPending) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!session) {
    router.push('/login')
    return null
  }

  return (
    <ZeroProvider>
      <div className="flex h-screen">
        <div className="hidden w-64 md:block">
          <AppSidebar />
        </div>
        <div className="flex flex-1 flex-col overflow-hidden">
          <AppHeader />
          <main className="bg-muted/30 flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </ZeroProvider>
  )
}
