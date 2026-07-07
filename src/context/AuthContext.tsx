import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

interface AuthState {
  ready: boolean
  usingCloud: boolean
  email: string | null
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) {
      // מצב מקומי — אין צורך בהתחברות
      setReady(true)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user.email ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      ready,
      usingCloud: isSupabaseConfigured,
      email,
      isAuthenticated: isSupabaseConfigured ? Boolean(email) : true,
      async signIn(e, p) {
        if (!supabase) return
        const { error } = await supabase.auth.signInWithPassword({ email: e, password: p })
        if (error) throw new Error(translateAuthError(error.message))
      },
      async signUp(e, p) {
        if (!supabase) return
        const { error } = await supabase.auth.signUp({ email: e, password: p })
        if (error) throw new Error(translateAuthError(error.message))
      },
      async signInWithGoogle() {
        if (!supabase) return
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin },
        })
        if (error) throw new Error(translateAuthError(error.message))
      },
      async signOut() {
        if (!supabase) return
        await supabase.auth.signOut()
      },
    }),
    [ready, email],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function translateAuthError(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return 'אימייל או סיסמה שגויים'
  if (/already registered/i.test(msg)) return 'המשתמש כבר רשום'
  if (/password should be at least/i.test(msg)) return 'הסיסמה חייבת להכיל לפחות 6 תווים'
  if (/unable to validate email/i.test(msg)) return 'כתובת אימייל לא תקינה'
  return msg
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
