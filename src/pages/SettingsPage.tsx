import { useAuth } from '../context/AuthContext'
import { useWallet } from '../context/WalletContext'
import { useTheme, type ThemePref } from '../context/ThemeContext'

const THEME_OPTIONS: { value: ThemePref; label: string; icon: string }[] = [
  { value: 'light', label: 'בהיר', icon: '☀️' },
  { value: 'dark', label: 'כהה', icon: '🌙' },
  { value: 'system', label: 'מערכת', icon: '🖥️' },
]

export function SettingsPage() {
  const { email, usingCloud, signOut } = useAuth()
  const { cards } = useWallet()
  const { pref, setPref } = useTheme()

  return (
    <div className="page">
      <header className="page__header">
        <h1 className="headline">הגדרות</h1>
      </header>

      <section className="card-surface">
        <label className="form__label">מראה</label>
        <div className="segmented" style={{ marginTop: 8 }}>
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={pref === opt.value ? 'is-active' : ''}
              onClick={() => setPref(opt.value)}
            >
              <span aria-hidden>{opt.icon}</span> {opt.label}
            </button>
          ))}
        </div>
      </section>

      <section className="card-surface info">
        <div className="info__row">
          <span className="info__label">מצב אחסון</span>
          <span className="info__value">{usingCloud ? 'ענן (Supabase)' : 'מקומי (מכשיר זה)'}</span>
        </div>
        {usingCloud && email && (
          <div className="info__row">
            <span className="info__label">משתמש</span>
            <span className="info__value" dir="ltr">{email}</span>
          </div>
        )}
        <div className="info__row">
          <span className="info__label">כרטיסים שמורים</span>
          <span className="info__value">{cards.length}</span>
        </div>
      </section>

      {!usingCloud && (
        <div className="alert alert--info">
          האפליקציה פועלת במצב מקומי. כדי לסנכרן בין מכשירים, הגדר את משתני Supabase בקובץ .env.local.
        </div>
      )}

      {usingCloud && (
        <button className="btn btn--ghost btn--block" onClick={signOut}>התנתקות</button>
      )}

      <p className="muted center small">ארנק דיגיטלי · גרסה 1.0</p>
    </div>
  )
}
