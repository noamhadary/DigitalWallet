import { useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { WalletIcon } from '../components/WalletIcon'

export function LoginPage() {
  const { signIn, signUp, signInWithGoogle } = useAuth()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function googleSignIn() {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await signInWithGoogle()
      // מכאן הדפדפן מנותב ל־Google וחוזר; הסשן נטען אוטומטית
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בהתחברות עם Google')
      setBusy(false)
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      if (mode === 'in') {
        await signIn(email, password)
      } else {
        await signUp(email, password)
        setNotice('נרשמת בהצלחה! ייתכן שתצטרך לאשר את כתובת האימייל.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <div className="auth__brand">
        <div className="auth__logo" aria-hidden>
          <WalletIcon size={52} />
        </div>
        <h1>הארנק הדיגיטלי</h1>
        <p>כל הכרטיסים שלך במקום אחד — תעודת זהות, רשיון נהיגה וכרטיסים מגנטיים.</p>
      </div>

      <form className="auth__form card-surface" onSubmit={submit}>
        <div className="segmented">
          <button type="button" className={mode === 'in' ? 'is-active' : ''} onClick={() => setMode('in')}>
            התחברות
          </button>
          <button type="button" className={mode === 'up' ? 'is-active' : ''} onClick={() => setMode('up')}>
            הרשמה
          </button>
        </div>

        <button type="button" className="btn btn--google btn--block" onClick={googleSignIn} disabled={busy}>
          <GoogleIcon />
          המשך עם Google
        </button>

        <div className="divider"><span>או באמצעות אימייל</span></div>

        <label className="field">
          <span>אימייל</span>
          <input
            type="email"
            dir="ltr"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            autoComplete="email"
          />
        </label>

        <label className="field">
          <span>סיסמה</span>
          <input
            type="password"
            dir="ltr"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="לפחות 6 תווים"
            autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
          />
        </label>

        {error && <div className="alert alert--error">{error}</div>}
        {notice && <div className="alert alert--ok">{notice}</div>}

        <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
          {busy ? 'רגע…' : mode === 'in' ? 'התחברות' : 'צור חשבון'}
        </button>
      </form>
    </div>
  )
}

/** לוגו Google הרשמי (מרובע-צבעים) */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden focusable="false">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.6 4.5 29.6 2.5 24 2.5 12.1 2.5 2.5 12.1 2.5 24S12.1 45.5 24 45.5 45.5 35.9 45.5 24c0-1.2-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M4.3 13.7l6.6 4.8C12.7 15 18 11.5 24 11.5c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.6 4.5 29.6 2.5 24 2.5 15.6 2.5 8.3 7.4 4.3 13.7z" />
      <path fill="#4CAF50" d="M24 45.5c5.5 0 10.4-2.1 14.1-5.5l-6.5-5.5c-2 1.5-4.7 2.5-7.6 2.5-5.2 0-9.6-3.3-11.2-8l-6.5 5C8.2 40.5 15.5 45.5 24 45.5z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.5 5.5c-.5.4 7.3-5.3 7.3-15 0-1.2-.1-2.4-.4-3.5z" />
    </svg>
  )
}
