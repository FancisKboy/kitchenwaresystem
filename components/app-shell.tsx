'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAppPreferences } from '@/app/providers'

type NavItem = {
  key: string
  href: string
  icon: string
  labelKey:
    | 'dashboard'
    | 'products'
    | 'purchases'
    | 'sales'
    | 'inventory'
    | 'stockManagement'
    | 'customers'
    | 'debts'
    | 'reports'
    | 'history'
    | 'settings'
}

const navItems: NavItem[] = [
  {
    key: 'dashboard',
    href: '/dashboard',
    icon: '⌂',
    labelKey: 'dashboard',
  },
  {
    key: 'products',
    href: '/products',
    icon: '▦',
    labelKey: 'products',
  },
  {
    key: 'purchases',
    href: '/purchases',
    icon: '↓',
    labelKey: 'purchases',
  },
  {
    key: 'sales',
    href: '/sales',
    icon: '↑',
    labelKey: 'sales',
  },
  {
    key: 'inventory',
    href: '/inventory',
    icon: '◫',
    labelKey: 'inventory',
  },
  {
    key: 'stock-management',
    href: '/stock-management',
    icon: '⚙',
    labelKey: 'stockManagement',
  },
  {
    key: 'customers',
    href: '/customers',
    icon: '◉',
    labelKey: 'customers',
  },
  {
    key: 'debts',
    href: '/debts',
    icon: '$',
    labelKey: 'debts',
  },
  {
    key: 'reports',
    href: '/reports',
    icon: '▤',
    labelKey: 'reports',
  },
  {
    key: 'history',
    href: '/history',
    icon: '◷',
    labelKey: 'history',
  },
  {
    key: 'settings',
    href: '#',
    icon: '⚙',
    labelKey: 'settings',
  },
]

export default function AppShell({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()

  const {
    t,
    language,
    theme,
    setLanguage,
    setTheme,
  } = useAppPreferences()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [userEmail, setUserEmail] = useState('User')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/')
        return
      }

      if (user.email) {
        setUserEmail(user.email)
      }

      setLoading(false)
    }

    loadUser()
  }, [router])

  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/')
    router.refresh()
  }

  function toggleTheme() {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const activeNavItem = navItems.find(
    (item) =>
      item.href !== '#' &&
      (item.href === '/dashboard'
        ? pathname === '/dashboard'
        : pathname.startsWith(item.href)),
  )

  const currentPageLabel = activeNavItem
    ? t(activeNavItem.labelKey)
    : t('dashboard')

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-950">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          Loading...
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-white">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-800 bg-slate-950 text-white shadow-2xl transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="flex h-20 shrink-0 items-center border-b border-slate-800 px-5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-lg font-black text-slate-950">
              K
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                V1
              </p>

              <h1 className="mt-0.5 text-base font-bold">
                {t('kitchenware')}
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="ml-auto flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <div className="mb-3 flex items-center justify-between px-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              {t('mainMenu')}
            </p>
          </div>

          <div className="space-y-1">
            {navItems.map((item) => {
              const active =
                item.href !== '#' &&
                (item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(item.href))

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    if (item.key === 'settings') {
                      setSettingsOpen(true)
                      setSidebarOpen(false)
                      return
                    }

                    router.push(item.href)
                  }}
                  className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-medium transition ${
                    active
                      ? 'bg-white text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm transition ${
                      active
                        ? 'bg-slate-100 text-slate-950'
                        : 'bg-slate-900 text-slate-400 group-hover:bg-slate-700 group-hover:text-white'
                    }`}
                  >
                    {item.icon}
                  </span>

                  <span className="truncate">
                    {t(item.labelKey)}
                  </span>

                  {active && (
                    <span className="ml-auto h-2 w-2 rounded-full bg-indigo-600" />
                  )}
                </button>
              )
            })}
          </div>
        </nav>

        {/* User */}
        <div className="shrink-0 border-t border-slate-800 p-4">
          <div className="mb-3 rounded-2xl border border-slate-800 bg-slate-900 p-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-bold text-slate-950">
                {userEmail.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {t('signedInAs')}
                </p>

                <p
                  className="mt-1 truncate text-sm font-medium text-white"
                  title={userEmail}
                >
                  {userEmail}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-xl border border-slate-700 px-3 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            {t('signOut')}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-72">

        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
          <div className="flex min-h-20 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">

            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 lg:hidden"
                aria-label="Open menu"
              >
                ☰
              </button>

              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  {t('overview')}
                </p>

                <h2 className="truncate text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
                  {currentPageLabel}
                </h2>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">

              {/* Language */}
              <button
                type="button"
                onClick={() =>
                  setLanguage(language === 'en' ? 'rw' : 'en')
                }
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {language === 'en' ? 'EN' : 'RW'}
              </button>

              {/* Theme */}
              <button
                type="button"
                onClick={toggleTheme}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? '☀' : '☾'}
              </button>

              {/* Settings */}
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
                aria-label="Open settings"
              >
                ⚙
              </button>

              <div className="hidden h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white dark:bg-white dark:text-slate-900 sm:flex">
                {userEmail.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {children}
      </div>

      {/* SETTINGS MODAL */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">

          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          >
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {t('settings')}
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {t('settingsDescription')}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                aria-label="Close settings"
              >
                ✕
              </button>
            </div>

            {/* Modal body */}
            <div className="space-y-7 p-6">

              {/* Theme */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t('appearance')}
                </h3>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {t('chooseTheme')}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`rounded-2xl border p-4 text-left transition ${
                      theme === 'light'
                        ? 'border-slate-900 bg-slate-50 ring-2 ring-slate-200 dark:border-white dark:bg-slate-800 dark:ring-slate-700'
                        : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="text-lg">☀</div>

                    <p className="mt-2 font-semibold text-slate-900 dark:text-white">
                      {t('light')}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`rounded-2xl border p-4 text-left transition ${
                      theme === 'dark'
                        ? 'border-slate-900 bg-slate-950 ring-2 ring-slate-300 dark:border-white dark:bg-slate-800 dark:ring-slate-700'
                        : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="text-lg">☾</div>

                    <p className="mt-2 font-semibold text-slate-900 dark:text-white">
                      {t('dark')}
                    </p>
                  </button>
                </div>
              </div>

              {/* Language */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t('language')}
                </h3>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {t('chooseLanguage')}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setLanguage('en')}
                    className={`rounded-2xl border p-4 text-left transition ${
                      language === 'en'
                        ? 'border-slate-900 bg-slate-50 ring-2 ring-slate-200 dark:border-white dark:bg-slate-800 dark:ring-slate-700'
                        : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
                    }`}
                  >
                    <p className="font-semibold text-slate-900 dark:text-white">
                      🇬🇧 {t('english')}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLanguage('rw')}
                    className={`rounded-2xl border p-4 text-left transition ${
                      language === 'rw'
                        ? 'border-slate-900 bg-slate-50 ring-2 ring-slate-200 dark:border-white dark:bg-slate-800 dark:ring-slate-700'
                        : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
                    }`}
                  >
                    <p className="font-semibold text-slate-900 dark:text-white">
                      🇷🇼 {t('kinyarwanda')}
                    </p>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 px-6 py-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                {language === 'en' ? 'Done' : 'Byarangiye'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}