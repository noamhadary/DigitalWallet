import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { CardCarousel } from '../components/CardCarousel'
import { CARD_TYPES, type CardType } from '../lib/types'

export function WalletPage() {
  const { cards, loading, error } = useWallet()
  const { resolved, setPref } = useTheme()
  const { avatarUrl, name, email } = useAuth()
  const [filter, setFilter] = useState<CardType | 'all'>('all')
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return cards.filter((c) => {
      if (filter !== 'all' && c.type !== filter) return false
      if (!q) return true
      return (
        c.title.toLowerCase().includes(q) ||
        (c.issuer ?? '').toLowerCase().includes(q) ||
        (c.holderName ?? '').toLowerCase().includes(q)
      )
    })
  }, [cards, filter, query])

  const usedTypes = useMemo(() => new Set(cards.map((c) => c.type)), [cards])

  return (
    <div className="page">
      <header className="page__header">
        <div className="wallet-title">
          {avatarUrl && (
            <img
              className="wallet-avatar"
              src={avatarUrl}
              alt={name ?? email ?? 'תמונת פרופיל'}
              referrerPolicy="no-referrer"
            />
          )}
          <div>
            <h1 className="headline">הארנק שלי</h1>
            <p className="muted">{cards.length} כרטיסים</p>
          </div>
        </div>
        <div className="page__header-actions">
          <button
            className="btn btn--ghost btn--icon"
            onClick={() => setPref(resolved === 'dark' ? 'light' : 'dark')}
            aria-label={resolved === 'dark' ? 'מעבר למצב בהיר' : 'מעבר למצב כהה'}
          >
            {resolved === 'dark' ? '☀️' : '🌙'}
          </button>
          <Link to="/add" className="btn btn--primary btn--icon" aria-label="הוספת כרטיס">＋</Link>
        </div>
      </header>

      {cards.length > 0 && (
        <>
          <input
            className="search"
            placeholder="חיפוש כרטיס…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="chips">
            <button className={`chip ${filter === 'all' ? 'is-active' : ''}`} onClick={() => setFilter('all')}>
              הכל
            </button>
            {CARD_TYPES.filter((t) => usedTypes.has(t.type)).map((t) => (
              <button
                key={t.type}
                className={`chip ${filter === t.type ? 'is-active' : ''}`}
                onClick={() => setFilter(t.type)}
              >
                <span aria-hidden>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>
        </>
      )}

      {loading && <div className="empty">טוען…</div>}
      {error && <div className="alert alert--error">{error}</div>}

      {!loading && cards.length === 0 && (
        <div className="empty empty--cta">
          <div className="empty__icon" aria-hidden>🗂️</div>
          <h2>הארנק ריק</h2>
          <p className="muted">הוסף את תעודת הזהות, רשיון הנהיגה או כל כרטיס מגנטי אחר.</p>
          <Link to="/add" className="btn btn--primary">הוספת כרטיס ראשון</Link>
        </div>
      )}

      {!loading && cards.length > 0 && visible.length === 0 && (
        <div className="empty">לא נמצאו כרטיסים תואמים</div>
      )}

      {visible.length > 0 && <CardCarousel cards={visible} />}
    </div>
  )
}
