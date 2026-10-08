import type { Metadata } from 'next'
import './globals.css'
import { AppProviders } from './providers'
import AppRouterLayout from '@/components/app-router-layout'

export const metadata: Metadata = {
  title: 'Kitchenware Management',
  description: 'Kitchenware business management system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-slate-100 text-slate-900 antialiased dark:bg-slate-950 dark:text-white">
        <AppProviders>
          <AppRouterLayout>{children}</AppRouterLayout>
        </AppProviders>
      </body>
    </html>
  )
}