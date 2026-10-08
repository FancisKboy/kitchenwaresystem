'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Language,
  translations,
} from '@/lib/i18n'

type Theme = 'light' | 'dark'

type AppPreferencesContextType = {
  language: Language
  theme: Theme
  setLanguage: (language: Language) => void
  setTheme: (theme: Theme) => void
  t: (key: keyof typeof translations.en) => string
}

const AppPreferencesContext =
  createContext<AppPreferencesContextType | null>(null)

export function AppProviders({
  children,
}: {
  children: React.ReactNode
}) {
  const [language, setLanguageState] = useState<Language>('en')
  const [theme, setThemeState] = useState<Theme>('light')

  useEffect(() => {
    const savedLanguage = localStorage.getItem(
      'kitchenware-language'
    )

    const savedTheme = localStorage.getItem(
      'kitchenware-theme'
    )

    if (savedLanguage === 'en' || savedLanguage === 'rw') {
      setLanguageState(savedLanguage)
    }

    if (savedTheme === 'light' || savedTheme === 'dark') {
      setThemeState(savedTheme)
    }
  }, [])

  useEffect(() => {
    const root = document.documentElement

    root.classList.remove('light', 'dark')
    root.classList.add(theme)

    localStorage.setItem('kitchenware-theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('kitchenware-language', language)
  }, [language])

  const value = useMemo(
    () => ({
      language,
      theme,

      setLanguage: (value: Language) => {
        setLanguageState(value)
      },

      setTheme: (value: Theme) => {
        setThemeState(value)

        const root = document.documentElement

        root.classList.remove('light', 'dark')
        root.classList.add(value)

        localStorage.setItem('kitchenware-theme', value)
      },

      t: (key: keyof typeof translations.en) =>
        translations[language][key],
    }),
    [language, theme]
  )

  return (
    <AppPreferencesContext.Provider value={value}>
      {children}
    </AppPreferencesContext.Provider>
  )
}

export function useAppPreferences() {
  const context = useContext(AppPreferencesContext)

  if (!context) {
    throw new Error(
      'useAppPreferences must be used inside AppProviders'
    )
  }

  return context
}