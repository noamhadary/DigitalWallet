import { Link } from 'react-router-dom'
import type { WalletCard } from '../lib/types'
import { getCardTypeMeta } from '../lib/types'
import { formatCardNumber } from '../lib/validators'

/** משטח כרטיס בסגנון כרטיס מגנטי — נועד לתצוגת רשימת הארנק */
export function CardTile({ card }: { card: WalletCard }) {
  const meta = getCardTypeMeta(card.type)
  const number = card.type === 'id' ? card.details.idNumber : card.cardNumber

  return (
    <Link
      to={`/card/${card.id}`}
      className={`card-tile ${card.imageData ? 'card-tile--photo' : ''}`}
      style={
        card.imageData
          ? { backgroundImage: `url(${card.imageData})` }
          : { background: gradient(card.frontColor) }
      }
    >
      {card.imageData && <div className="card-tile__scrim" aria-hidden />}
      <div className="card-tile__top">
        <span className="card-tile__type">
          <span aria-hidden>{meta.icon}</span> {meta.label}
        </span>
        {card.isFavorite && <span className="card-tile__fav" aria-label="מועדף">★</span>}
      </div>

      {!card.imageData && <div className="card-tile__stripe" aria-hidden />}

      <div className="card-tile__body">
        <div className="card-tile__title">{card.title}</div>
        {number && <div className="card-tile__number">{maskCardNumber(number, card.type)}</div>}
      </div>

      <div className="card-tile__bottom">
        {card.holderName && <span>{card.holderName}</span>}
        {card.issuer && <span className="card-tile__issuer">{card.issuer}</span>}
      </div>
    </Link>
  )
}

function gradient(color: string): string {
  return `linear-gradient(135deg, ${color} 0%, ${shade(color, -18)} 100%)`
}

function maskCardNumber(value: string, type: WalletCard['type']): string {
  if (type === 'id' || type === 'license') return value
  const digits = value.replace(/\D/g, '')
  if (digits.length <= 4) return formatCardNumber(digits)
  return `•••• •••• •••• ${digits.slice(-4)}`
}

/** הכהיה/הבהרה של צבע hex */
function shade(hex: string, percent: number): string {
  const m = hex.replace('#', '')
  if (m.length !== 6) return hex
  const num = parseInt(m, 16)
  const amt = Math.round(2.55 * percent)
  const r = Math.max(0, Math.min(255, (num >> 16) + amt))
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amt))
  const b = Math.max(0, Math.min(255, (num & 0xff) + amt))
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}
