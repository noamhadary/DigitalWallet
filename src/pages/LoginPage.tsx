import { useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

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
        <div className="auth__logo" aria-hidden>👛</div>
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
