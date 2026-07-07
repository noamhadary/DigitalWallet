import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { Barcode } from '../components/Barcode'
import { BarcodeScanner } from '../components/BarcodeScanner'
import { getCardTypeMeta } from '../lib/types'
import { formatCardNumber } from '../lib/validators'

export function CardDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { cards, deleteCard, toggleFavorite, updateCard } = useWallet()
  const card = useMemo(() => cards.find((c) => c.id === id), [cards, id])
  const [confirming, setConfirming] = useState(false)
  const [scanningBarcode, setScanningBarcode] = useState(false)

  if (!card) {
    return (
      <div className="page">
        <div className="empty">
          <p>הכרטיס לא נמצא</p>
          <button className="btn btn--primary" onClick={() => navigate('/')}>חזרה לארנק</button>
        </div>
      </div>
    )
  }

  const meta = getCardTypeMeta(card.type)
  const scanValue = card.barcodeData || card.cardNumber || card.details.idNumber || card.details.licenseNumber
  const number = card.type === 'id' ? card.details.idNumber : card.cardNumber

  const detailEntries = meta.fields
    .map((f) => [f.label, card.details[f.key]] as const)
    .filter(([, v]) => v)

  async function onDelete() {
    await deleteCard(card!.id)
    navigate('/')
  }

  /** מעדכן את מספר הכרטיס מתוך ערך ברקוד שנסרק */
  async function onBarcodeScanned(value: string) {
    const clean = value.trim()
    setScanningBarcode(false)
    if (!card || !clean) return
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = card
    if (card.type === 'id') {
      await updateCard(card.id, {
        ...rest,
        barcodeData: clean,
        details: { ...card.details, idNumber: clean },
      })
    } else {
      await updateCard(card.id, { ...rest, barcodeData: clean, cardNumber: clean })
    }
  }

  return (
    <div className="page detail">
      <header className="page__header">
        <button className="btn btn--ghost btn--icon" onClick={() => navigate(-1)} aria-label="חזרה">›</button>
        <div className="detail__actions">
          <button
            className="btn btn--ghost btn--icon"
            onClick={() => toggleFavorite(card.id, !card.isFavorite)}
            aria-label="מועדף"
          >
            {card.isFavorite ? '★' : '☆'}
          </button>
          <button className="btn btn--ghost btn--icon" onClick={() => navigate(`/edit/${card.id}`)} aria-label="עריכה">✎</button>
          <button className="btn btn--ghost btn--icon" onClick={() => setConfirming(true)} aria-label="מחיקה">🗑</button>
        </div>
      </header>

      {/* תמונות הכרטיס שצולמו — חזית וגב */}
      {(card.imageData || card.imageBackData) && (
        <div className="detail__photos">
          {card.imageData && (
            <figure className="detail__photo">
              <img src={card.imageData} alt={`חזית ${card.title}`} />
              {card.imageBackData && <figcaption>חזית</figcaption>}
            </figure>
          )}
          {card.imageBackData && (
            <figure className="detail__photo">
              <img src={card.imageBackData} alt={`גב ${card.title}`} />
              {card.imageData && <figcaption>גב</figcaption>}
            </figure>
          )}
        </div>
      )}

      {/* תצוגת הכרטיס */}
      <div
        className="detail__card"
        style={{ background: `linear-gradient(135deg, ${card.frontColor}, ${card.frontColor}dd)` }}
      >
        <div className="detail__card-top">
          <span>{meta.icon} {meta.label}</span>
          {card.issuer && <span>{card.issuer}</span>}
        </div>
        <div className="detail__card-stripe" aria-hidden />
        <div className="detail__card-title">{card.title}</div>
        {number && <div className="detail__card-number">{card.type === 'id' ? number : formatCardNumber(number)}</div>}
        {card.holderName && <div className="detail__card-holder">{card.holderName}</div>}
      </div>

      {/* ברקוד לסריקה */}
      {scanValue && (
        <section className="card-surface scan">
          <div className="scan__label">הצג לקורא / סורק</div>
          <Barcode value={scanValue} format={card.barcodeFormat} />
        </section>
      )}

      {/* סריקת ברקוד למשיכת מספר הכרטיס */}
      <section className="card-surface scan-barcode">
        <button className="btn btn--block scan-btn" onClick={() => setScanningBarcode(true)}>
          📷 סריקת ברקוד — משיכת {card.type === 'id' ? 'מספר ת.ז' : 'מספר הכרטיס'}
        </button>
      </section>

      {/* פרטים */}
      {detailEntries.length > 0 && (
        <section className="card-surface info">
          {detailEntries.map(([label, value]) => (
            <div className="info__row" key={label}>
              <span className="info__label">{label}</span>
              <span className="info__value" dir="auto">{value}</span>
            </div>
          ))}
        </section>
      )}

      {card.notes && (
        <section className="card-surface info">
          <div className="info__row info__row--col">
            <span className="info__label">הערות</span>
            <span className="info__value">{card.notes}</span>
          </div>
        </section>
      )}

      {confirming && (
        <div className="sheet" onClick={() => setConfirming(false)}>
          <div className="sheet__panel" onClick={(e) => e.stopPropagation()}>
            <h3>למחוק את הכרטיס?</h3>
            <p className="muted">פעולה זו אינה הפיכה.</p>
            <div className="sheet__actions">
              <button className="btn btn--ghost" onClick={() => setConfirming(false)}>ביטול</button>
              <button className="btn btn--danger" onClick={onDelete}>מחיקה</button>
            </div>
          </div>
        </div>
      )}

      {scanningBarcode && (
        <BarcodeScanner onResult={onBarcodeScanned} onClose={() => setScanningBarcode(false)} />
      )}
    </div>
  )
}
