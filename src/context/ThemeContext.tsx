import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type ThemePref = 'light' | 'dark' | 'system'

interface ThemeState {
  pref: ThemePref
  /** מצב התצוגה בפועל אחרי פתרון 'system' */
  resolved: 'light' | 'dark'
  setPref: (p: ThemePref) => void
}

const ThemeContext = createContext<ThemeState | null>(null)
const KEY = 'digital-wallet:theme'

function systemDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(() => {
    return (localStorage.getItem(KEY) as ThemePref) || 'system'
  })
  const [systemIsDark, setSystemIsDark] = useState(systemDark)

  // מעקב אחר שינוי העדפת המערכת
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setSystemIsDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const resolved: 'light' | 'dark' = pref === 'system' ? (systemIsDark ? 'dark' : 'light') : pref

  // החלת ה־theme על ה־DOM + עדכון צבע הדפדפן
  useEffect(() => {
    document.documentElement.dataset.theme = resolved
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', resolved === 'dark' ? '#0f1011' : '#595f63')
  }, [resolved])

  const setPref = (p: ThemePref) => {
    setPrefState(p)
    localStorage.setItem(KEY, p)
  }

  const value = useMemo<ThemeState>(() => ({ pref, resolved, setPref }), [pref, resolved])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
