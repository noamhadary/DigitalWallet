import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { CARD_TYPES, getCardTypeMeta, type BarcodeFormat, type CardInput, type CardType } from '../lib/types'
import { isValidIsraeliId } from '../lib/validators'
import { CardScanner } from '../components/CardScanner'
import type { ExtractedInfo } from '../lib/ocr'

const COLORS = [
  '#595f63', '#44474a', '#3d4348', '#5d5e60', '#4a5560', '#767779',
  '#3d4e6b', '#2f3e46', '#34506b', '#1f3a5f',
  '#5a6b5e', '#3a5a40', '#2c5f5a', '#40655a',
  '#695b55', '#5b4636', '#7a5c3a', '#8a4b4b', '#6a4c4c', '#4a3f5e', '#5e4b6b',
]

export function AddCardPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { cards, addCard, updateCard } = useWallet()
  const editing = Boolean(id)
  const existing = useMemo(() => cards.find((c) => c.id === id), [cards, id])

  const [type, setType] = useState<CardType>('id')
  const [title, setTitle] = useState('')
  const [issuer, setIssuer] = useState('')
  const [holderName, setHolderName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [barcodeData, setBarcodeData] = useState('')
  const [barcodeFormat, setBarcodeFormat] = useState<BarcodeFormat>('CODE128')
  const [frontColor, setFrontColor] = useState(COLORS[0])
  const [details, setDetails] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState('')
  const [imageData, setImageData] = useState<string | undefined>(undefined)
  const [imageBackData, setImageBackData] = useState<string | undefined>(undefined)
  const [scanning, setScanning] = useState<'front' | 'back' | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // טעינת ערכים במצב עריכה
  useEffect(() => {
    if (existing) {
      setType(existing.type)
      setTitle(existing.title)
      setIssuer(existing.issuer ?? '')
      setHolderName(existing.holderName ?? '')
      setCardNumber(existing.cardNumber ?? '')
      setBarcodeData(existing.barcodeData ?? '')
      setBarcodeFormat(existing.barcodeFormat ?? 'CODE128')
      setFrontColor(existing.frontColor)
      setDetails(existing.details ?? {})
      setNotes(existing.notes ?? '')
      setImageData(existing.imageData)
      setImageBackData(existing.imageBackData)
    }
  }, [existing])

  const meta = getCardTypeMeta(type)

  function pickType(t: CardType) {
    setType(t)
    setFrontColor(getCardTypeMeta(t).color)
    if (!title) setTitle(getCardTypeMeta(t).label)
  }

  /** ממלא שדות ריקים מתוך התוצאות שזוהו ב־OCR (לא דורס ערכים קיימים) */
  function applyExtracted(info: ExtractedInfo) {
    if (info.holderName && !holderName.trim()) setHolderName(info.holderName)
    if (info.cardNumber && !cardNumber.trim()) setCardNumber(info.cardNumber)
    if (info.details && Object.keys(info.details).length) {
      setDetails((prev) => {
        const next = { ...prev }
        for (const [k, v] of Object.entries(info.details)) {
          if (v && !next[k]?.trim()) next[k] = v
        }
        return next
      })
    }
  }

  const idInvalid =
    type === 'id' && details.idNumber && details.idNumber.length >= 5 && !isValidIsraeliId(details.idNumber)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError('יש להזין שם לכרטיס')
      return
    }
    setBusy(true)
    setError(null)
    const input: CardInput = {
      type,
      title: title.trim(),
      issuer: issuer.trim() || undefined,
      holderName: holderName.trim() || undefined,
      cardNumber: cardNumber.trim() || undefined,
      barcodeData: barcodeData.trim() || undefined,
      barcodeFormat,
      frontColor,
      imageData,
      imageBackData,
      details: Object.fromEntries(Object.entries(details).filter(([, v]) => v && v.trim())),
      notes: notes.trim() || undefined,
      isFavorite: existing?.isFavorite ?? false,
    }
    try {
      if (editing && id) {
        await updateCard(id, input)
        navigate(`/card/${id}`)
      } else {
        const created = await addCard(input)
        navigate(`/card/${created.id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שמירה נכשלה')
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <header className="page__header">
        <button className="btn btn--ghost btn--icon" onClick={() => navigate(-1)} aria-label="חזרה">
          ›
        </button>
        <h1 className="headline">{editing ? 'עריכת כרטיס' : 'כרטיס חדש'}</h1>
        <span style={{ width: 44 }} />
      </header>

      <form className="form" onSubmit={submit}>
        {!editing && (
          <section className="form__group">
            <label className="form__label">סוג הכרטיס</label>
            <div className="type-grid">
              {CARD_TYPES.map((t) => (
                <button
                  key={t.type}
                  type="button"
                  className={`type-card ${type === t.type ? 'is-active' : ''}`}
                  onClick={() => pickType(t.type)}
                >
                  <span className="type-card__icon" aria-hidden>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* צילום וחיתוך הכרטיס — חזית וגב */}
        <section className="form__group card-surface">
          <label className="form__label">📷 צילום הכרטיס — חיתוך אוטומטי</label>
          <div className="scan-slots">
            <ScanSlot
              label="חזית"
              image={imageData}
              onScan={() => setScanning('front')}
              onRemove={() => setImageData(undefined)}
            />
            <ScanSlot
              label="גב"
              image={imageBackData}
              onScan={() => setScanning('back')}
              onRemove={() => setImageBackData(undefined)}
            />
          </div>
        </section>

        <section className="form__group card-surface">
          <label className="field">
            <span>שם הכרטיס *</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={meta.label} required />
          </label>

          <label className="field">
            <span>שם בעל הכרטיס</span>
            <input value={holderName} onChange={(e) => setHolderName(e.target.value)} placeholder="ישראל ישראלי" />
          </label>

          <label className="field">
            <span>מנפיק / חברה</span>
            <input value={issuer} onChange={(e) => setIssuer(e.target.value)} placeholder="למשל: משרד התחבורה" />
          </label>

          {type !== 'id' && (
            <label className="field">
              <span>מספר כרטיס</span>
              <input
                dir="ltr"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="0000 0000 0000 0000"
              />
            </label>
          )}
        </section>

        {/* שדות ייעודיים לסוג הכרטיס */}
        <section className="form__group card-surface">
          <label className="form__label">{meta.icon} פרטי {meta.label}</label>
          {meta.fields.map((f) => (
            <label className="field" key={f.key}>
              <span>{f.label}</span>
              <input
                dir={/number|date|id|license/i.test(f.key) ? 'ltr' : 'rtl'}
                value={details[f.key] ?? ''}
                onChange={(e) => setDetails((d) => ({ ...d, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
              />
              {f.key === 'idNumber' && idInvalid && (
                <small className="field__error">מספר תעודת זהות לא תקין</small>
              )}
            </label>
          ))}
        </section>

        {/* ברקוד */}
        <section className="form__group card-surface">
          <label className="form__label">ברקוד / קוד סריקה</label>
          <label className="field">
            <span>נתוני הברקוד</span>
            <input
              dir="ltr"
              value={barcodeData}
              onChange={(e) => setBarcodeData(e.target.value)}
              placeholder="המספר שמופיע בברקוד"
            />
          </label>
          <div className="segmented segmented--sm">
            {(['CODE128', 'EAN13', 'QR'] as BarcodeFormat[]).map((fmt) => (
              <button
                key={fmt}
                type="button"
                className={barcodeFormat === fmt ? 'is-active' : ''}
                onClick={() => setBarcodeFormat(fmt)}
              >
                {fmt === 'QR' ? 'QR' : fmt}
              </button>
            ))}
          </div>
        </section>

        {/* צבע */}
        <section className="form__group card-surface">
          <label className="form__label">צבע הכרטיס</label>
          <div className="colors">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`swatch ${frontColor === c ? 'is-active' : ''}`}
                style={{ background: c }}
                onClick={() => setFrontColor(c)}
                aria-label={`צבע ${c}`}
              />
            ))}
          </div>
        </section>

        <section className="form__group card-surface">
          <label className="field">
            <span>הערות</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="הערות אישיות…" />
          </label>
        </section>

        {error && <div className="alert alert--error">{error}</div>}

        <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
          {busy ? 'שומר…' : editing ? 'שמירת שינויים' : 'שמירת הכרטיס'}
        </button>
      </form>

      {scanning && (
        <CardScanner
          cardType={type}
          onClose={() => setScanning(null)}
          onDone={(url, extracted) => {
            if (scanning === 'front') setImageData(url)
            else setImageBackData(url)
            if (extracted) applyExtracted(extracted)
            setScanning(null)
          }}
        />
      )}
    </div>
  )
}

/** משבצת צילום בודדת (חזית/גב) בטופס */
function ScanSlot({
  label,
  image,
  onScan,
  onRemove,
}: {
  label: string
  image?: string
  onScan: () => void
  onRemove: () => void
}) {
  return (
    <div className="scan-slot">
      <span className="scan-slot__label">{label}</span>
      {image ? (
        <div className="scan-slot__has">
          <img src={image} alt={label} className="scan-slot__img" />
          <div className="scan-slot__actions">
            <button type="button" className="btn btn--ghost btn--sm" onClick={onScan}>
              החלפה
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={onRemove}>
              הסרה
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn scan-btn scan-slot__btn" onClick={onScan}>
          📷 צילום {label}
        </button>
      )}
    </div>
  )
}
