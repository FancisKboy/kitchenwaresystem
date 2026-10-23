'use client'

import {
  useEffect,
  useState,
} from 'react'
import {
  usePathname,
  useRouter,
} from 'next/navigation'
import Image from 'next/image'

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

  const [sidebarOpen, setSidebarOpen] =
    useState(false)

  const [settingsOpen, setSettingsOpen] =
    useState(false)

  const [userEmail, setUserEmail] =
    useState('User')

  const [loading, setLoading] =
    useState(true)

  /*
   * Load authenticated user
   */
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

    void loadUser()
  }, [router])

  /*
   * Close mobile sidebar whenever
   * the current page changes.
   */
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  /*
   * Global Settings opener.
   *
   * Dashboard can dispatch:
   *
   * window.dispatchEvent(
   *   new Event('open-app-settings')
   * )
   *
   * and this AppShell opens the same
   * Settings popup used everywhere else.
   */
  useEffect(() => {
    function handleOpenSettings() {
      setSettingsOpen(true)
      setSidebarOpen(false)
    }

    window.addEventListener(
      'open-app-settings',
      handleOpenSettings,
    )

    return () => {
      window.removeEventListener(
        'open-app-settings',
        handleOpenSettings,
      )
    }
  }, [])

  /*
   * Close settings with Escape.
   */
  useEffect(() => {
    if (!settingsOpen) {
      return
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === 'Escape') {
        setSettingsOpen(false)
      }
    }

    window.addEventListener(
      'keydown',
      handleKeyDown,
    )

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown,
      )
    }
  }, [settingsOpen])

  /*
   * Prevent page scrolling while
   * Settings popup is open.
   */
  useEffect(() => {
    if (!settingsOpen) {
      return
    }

    const previousOverflow =
      document.body.style.overflow

    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow =
        previousOverflow
    }
  }, [settingsOpen])

  async function handleLogout() {
    await supabase.auth.signOut()

    router.replace('/')
    router.refresh()
  }

  function toggleTheme() {
    setTheme(
      theme === 'dark'
        ? 'light'
        : 'dark',
    )
  }

  function openSettings() {
    setSettingsOpen(true)
    setSidebarOpen(false)
  }

  function closeSettings() {
    setSettingsOpen(false)
  }

  const activeNavItem =
    navItems.find(
      (item) =>
        item.href !== '#' &&
        (item.href === '/dashboard'
          ? pathname === '/dashboard'
          : pathname.startsWith(
              item.href,
            )),
    )

  const currentPageLabel =
    activeNavItem
      ? t(activeNavItem.labelKey)
      : t('dashboard')

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-950">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-medium text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          Loading...
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-white">
      {/* ================= MOBILE OVERLAY ================= */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() =>
            setSidebarOpen(false)
          }
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* ================= SIDEBAR ================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-800 bg-slate-950 text-white shadow-2xl transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen
            ? 'translate-x-0'
            : '-translate-x-full'
        }`}
      >
        {/* Brand: Edizokitchenware */}
        <div className="flex h-20 shrink-0 items-center border-b border-slate-800 px-5 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Image
              src="/edizokitchenware-icon.png"
              alt="Edizokitchenware logo"
              width={48}
              height={48}
              priority
              className="h-12 w-12 shrink-0 rounded-2xl object-cover shadow-lg shadow-blue-950/30 ring-1 ring-blue-400/30"
            />

            <div className="min-w-0">
              <h1 className="truncate text-[15px] font-black leading-tight tracking-tight text-white">
                Edizokitchenware
              </h1>
              <p className="mt-1 truncate text-[9px] font-bold uppercase tracking-[0.14em] text-blue-300">
                Management System
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setSidebarOpen(false)
            }
            className="ml-auto flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <div className="mb-3 flex items-center justify-between px-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              {t('mainMenu')}
            </p>
          </div>

          <div className="space-y-1">
            {navItems.map(
              (item) => {
                const active =
                  item.href !== '#' &&
                  (item.href ===
                  '/dashboard'
                    ? pathname ===
                      '/dashboard'
                    : pathname.startsWith(
                        item.href,
                      ))

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      if (
                        item.key ===
                        'settings'
                      ) {
                        openSettings()
                        return
                      }

                      router.push(
                        item.href,
                      )
                    }}
                    className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold transition ${
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
                      {t(
                        item.labelKey,
                      )}
                    </span>

                    {active && (
                      <span className="ml-auto h-2 w-2 rounded-full bg-indigo-600" />
                    )}
                  </button>
                )
              },
            )}
          </div>
        </nav>

        {/* User */}
        <div className="shrink-0 border-t border-slate-800 p-4">
          <div className="mb-3 rounded-2xl border border-slate-800 bg-slate-900 p-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-black text-slate-950">
                {userEmail
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  {t('signedInAs')}
                </p>

                <p
                  className="mt-1 truncate text-sm font-medium text-white"
                  title={
                    userEmail
                  }
                >
                  {userEmail}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={
              handleLogout
            }
            className="w-full rounded-xl border border-slate-700 px-3 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            {t('signOut')}
          </button>
        </div>
      </aside>

      {/* ================= MAIN ================= */}
      <div className="lg:pl-72">
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
          <div className="flex min-h-20 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              {/* Mobile menu */}
              <button
                type="button"
                onClick={() =>
                  setSidebarOpen(true)
                }
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 lg:hidden"
                aria-label="Open menu"
              >
                ☰
              </button>

              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  {t('overview')}
                </p>

                <h2 className="truncate text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
                  {currentPageLabel}
                </h2>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {/* Language */}
              <button
                type="button"
                onClick={() =>
                  setLanguage(
                    language ===
                      'en'
                      ? 'rw'
                      : 'en',
                  )
                }
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {language ===
                'en'
                  ? 'EN'
                  : 'RW'}
              </button>

              {/* Theme */}
              <button
                type="button"
                onClick={
                  toggleTheme
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
                aria-label="Toggle theme"
                title="Toggle theme"
              >
                {theme ===
                'dark'
                  ? '☀'
                  : '☾'}
              </button>

              {/* Settings */}
              <button
                type="button"
                onClick={
                  openSettings
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
                aria-label="Open settings"
                title="Settings"
              >
                ⚙
              </button>

              {/* Avatar */}
              <div className="hidden h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-black text-white shadow-sm dark:bg-white dark:text-slate-900 sm:flex">
                {userEmail
                  .charAt(0)
                  .toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {children}
      </div>

      {/* ================= SETTINGS MODAL ================= */}
      {settingsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeSettings()
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-settings-title"
            className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          >
            {/* Modal header */}
            <div className="shrink-0 border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:px-6">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      ⚙
                    </div>

                    <div>
                      <h2
                        id="app-settings-title"
                        className="text-xl font-black text-slate-900 dark:text-white"
                      >
                        {t('settings')}
                      </h2>

                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {t(
                          'settingsDescription',
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={
                    closeSettings
                  }
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                  aria-label="Close settings"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto overscroll-contain px-5 py-6 sm:px-6">
              <div className="space-y-7">
                {/* Appearance */}
                <div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                      ◐
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">
                        {t(
                          'appearance',
                        )}
                      </h3>

                      <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
                        {t(
                          'chooseTheme',
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {/* Light */}
                    <button
                      type="button"
                      onClick={() =>
                        setTheme(
                          'light',
                        )
                      }
                      className={`rounded-2xl border p-4 text-left transition ${
                        theme ===
                        'light'
                          ? 'border-slate-900 bg-slate-50 ring-2 ring-slate-200 dark:border-white dark:bg-slate-800 dark:ring-slate-700'
                          : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xl">
                          ☀
                        </span>

                        {theme ===
                          'light' && (
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs text-white dark:bg-white dark:text-slate-900">
                            ✓
                          </span>
                        )}
                      </div>

                      <p className="mt-3 font-black text-slate-900 dark:text-white">
                        {t('light')}
                      </p>

                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Clean bright
                        interface
                      </p>
                    </button>

                    {/* Dark */}
                    <button
                      type="button"
                      onClick={() =>
                        setTheme(
                          'dark',
                        )
                      }
                      className={`rounded-2xl border p-4 text-left transition ${
                        theme ===
                        'dark'
                          ? 'border-slate-900 bg-slate-950 ring-2 ring-slate-300 dark:border-white dark:bg-slate-800 dark:ring-slate-700'
                          : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xl">
                          ☾
                        </span>

                        {theme ===
                          'dark' && (
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs text-slate-900">
                            ✓
                          </span>
                        )}
                      </div>

                      <p className="mt-3 font-black text-slate-900 dark:text-white">
                        {t('dark')}
                      </p>

                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Focused dark
                        workspace
                      </p>
                    </button>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-slate-200 dark:bg-slate-800" />

                {/* Language */}
                <div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                      A
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">
                        {t('language')}
                      </h3>

                      <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
                        {t(
                          'chooseLanguage',
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {/* English */}
                    <button
                      type="button"
                      onClick={() =>
                        setLanguage(
                          'en',
                        )
                      }
                      className={`rounded-2xl border p-4 text-left transition ${
                        language ===
                        'en'
                          ? 'border-slate-900 bg-slate-50 ring-2 ring-slate-200 dark:border-white dark:bg-slate-800 dark:ring-slate-700'
                          : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-black text-slate-900 dark:text-white">
                          🇬🇧{' '}
                          {t(
                            'english',
                          )}
                        </p>

                        {language ===
                          'en' && (
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs text-white dark:bg-white dark:text-slate-900">
                            ✓
                          </span>
                        )}
                      </div>
                    </button>

                    {/* Kinyarwanda */}
                    <button
                      type="button"
                      onClick={() =>
                        setLanguage(
                          'rw',
                        )
                      }
                      className={`rounded-2xl border p-4 text-left transition ${
                        language ===
                        'rw'
                          ? 'border-slate-900 bg-slate-50 ring-2 ring-slate-200 dark:border-white dark:bg-slate-800 dark:ring-slate-700'
                          : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-black text-slate-900 dark:text-white">
                          🇷🇼{' '}
                          {t(
                            'kinyarwanda',
                          )}
                        </p>

                        {language ===
                          'rw' && (
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs text-white dark:bg-white dark:text-slate-900">
                            ✓
                          </span>
                        )}
                      </div>
                    </button>
                  </div>
                </div>

                {/* Current settings summary */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                    Current Preferences
                  </p>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium text-slate-400">
                        Theme
                      </p>

                      <p className="mt-1 text-sm font-black capitalize text-slate-900 dark:text-white">
                        {theme}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-slate-400">
                        Language
                      </p>

                      <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                        {language ===
                        'en'
                          ? t(
                              'english',
                            )
                          : t(
                              'kinyarwanda',
                            )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
              <button
                type="button"
                onClick={
                  closeSettings
                }
                className="w-full rounded-2xl bg-slate-900 px-4 py-3.5 text-sm font-black text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                {language ===
                'en'
                  ? 'Done'
                  : 'Byarangiye'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}