import { useState } from 'react'
import { useWallet } from '../context/WalletContext'
import { useProfile } from '../context/ProfileContext'
import { useTheme, type ThemePref } from '../context/ThemeContext'
import { storage } from '../lib/storage'

const THEME_OPTIONS: { value: ThemePref; label: string; icon: string }[] = [
  { value: 'light', label: 'בהיר', icon: '☀️' },
  { value: 'dark', label: 'כהה', icon: '🌙' },
  { value: 'system', label: 'מערכת', icon: '🖥️' },
]

/** קורא תמונה, חותך לריבוע ומקטין ל־256px כדי לשמור על גודל אחסון סביר */
async function fileToAvatar(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result as string)
    r.onerror = rej
    r.readAsDataURL(file)
  })
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image()
    i.onload = () => res(i)
    i.onerror = rej
    i.src = dataUrl
  })
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const s = Math.min(img.width, img.height)
  ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size)
  return canvas.toDataURL('image/jpeg', 0.85)
}

export function SettingsPage() {
  const { cards, refresh } = useWallet()
  const { profile, save } = useProfile()
  const { pref, setPref } = useTheme()
  const [msg, setMsg] = useState<string | null>(null)

  async function onPickAvatar(file: File | undefined) {
    if (!file) return
    try {
      save({ ...profile, avatar: await fileToAvatar(file) })
    } catch {
      setMsg('טעינת התמונה נכשלה')
    }
  }

  function exportBackup() {
    const bundle = {
      app: 'digital-wallet',
      version: 1,
      exportedAt: new Date().toISOString(),
      profile,
      cards,
    }
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `wallet-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMsg('הגיבוי יוצא בהצלחה')
  }

  async function importBackup(file: File | undefined) {
    if (!file) return
    if (!confirm('הייבוא יחליף את כל הכרטיסים הקיימים במכשיר זה. להמשיך?')) return
    try {
      const data = JSON.parse(await file.text())
      if (!Array.isArray(data.cards)) throw new Error('קובץ גיבוי לא תקין')
      await storage.replaceAll(data.cards)
      if (data.profile && typeof data.profile === 'object') save(data.profile)
      await refresh()
      setMsg(`הייבוא הושלם — ${data.cards.length} כרטיסים`)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'הייבוא נכשל')
    }
  }

  return (
    <div className="page">
      <header className="page__header">
        <h1 className="headline">הגדרות</h1>
      </header>

      {/* פרופיל */}
      <section className="card-surface">
        <label className="form__label">פרופיל</label>
        <div className="profile-edit">
          <div className="profile-edit__avatar">
            {profile.avatar ? <img src={profile.avatar} alt="תמונת פרופיל" /> : <span aria-hidden>👤</span>}
          </div>
          <div className="profile-edit__actions">
            <label className="btn btn--ghost btn--sm">
              {profile.avatar ? 'החלפת תמונה' : 'בחירת תמונה'}
              <input type="file" accept="image/*" hidden onChange={(e) => onPickAvatar(e.target.files?.[0])} />
            </label>
            {profile.avatar && (
              <button className="btn btn--ghost btn--sm" onClick={() => save({ ...profile, avatar: undefined })}>
                הסרה
              </button>
            )}
          </div>
        </div>
        <label className="field" style={{ marginTop: 12 }}>
          <span>שם לתצוגה</span>
          <input
            value={profile.name}
            onChange={(e) => save({ ...profile, name: e.target.value })}
            placeholder="השם שלך"
          />
        </label>
      </section>

      {/* מראה */}
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

      {/* גיבוי */}
      <section className="card-surface">
        <label className="form__label">גיבוי ושחזור</label>
        <p className="muted small" style={{ margin: '4px 0 12px' }}>
          האחסון מקומי בלבד. ייצא קובץ גיבוי כדי לא לאבד את הכרטיסים בעת ניקוי הדפדפן או מעבר מכשיר.
        </p>
        <div className="profile-edit__actions">
          <button className="btn btn--ghost" onClick={exportBackup}>⬇️ ייצוא גיבוי</button>
          <label className="btn btn--ghost">
            ⬆️ ייבוא גיבוי
            <input type="file" accept="application/json,.json" hidden onChange={(e) => importBackup(e.target.files?.[0])} />
          </label>
        </div>
      </section>

      {msg && <div className="alert alert--ok">{msg}</div>}

      <section className="card-surface info">
        <div className="info__row">
          <span className="info__label">מצב אחסון</span>
          <span className="info__value">מקומי (מכשיר זה)</span>
        </div>
        <div className="info__row">
          <span className="info__label">כרטיסים שמורים</span>
          <span className="info__value">{cards.length}</span>
        </div>
      </section>

      <p className="muted center small">ארנק דיגיטלי · גרסה 1.0 · מקומי</p>
    </div>
  )
}
