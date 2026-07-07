import { NavLink, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { WalletIcon } from './WalletIcon'

const items: { to: string; label: string; icon: ReactNode; exact: boolean }[] = [
  { to: '/', label: 'הארנק', icon: <WalletIcon size={24} />, exact: true },
  { to: '/add', label: 'הוספה', icon: '＋', exact: false },
  { to: '/settings', label: 'הגדרות', icon: '⚙️', exact: false },
]

export function BottomNav() {
  const { pathname } = useLocation()
  // מסתירים את הניווט בתצוגת כרטיס בודד (מסך מלא)
  if (pathname.startsWith('/card/') || pathname.startsWith('/edit/')) return null

  return (
    <nav className="bottom-nav">
      {items.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end={it.exact}
          className={({ isActive }) => `bottom-nav__item ${isActive ? 'is-active' : ''}`}
        >
          <span className="bottom-nav__icon" aria-hidden>{it.icon}</span>
          <span className="bottom-nav__label">{it.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
