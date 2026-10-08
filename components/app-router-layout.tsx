'use client'

import { usePathname } from 'next/navigation'
import AppShell from '@/components/app-shell'

export default function AppRouterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  // Keep the login page outside the authenticated app shell.
  if (pathname === '/') {
    return <>{children}</>
  }

  return <AppShell>{children}</AppShell>
}