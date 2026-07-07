import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CardTile } from './CardTile'
import type { WalletCard } from '../lib/types'

const SPACING = 120 // מרחק אנכי בין מרכזי כרטיסים סמוכים
const ANGLE = 18 // מעלות סיבוב לכל צעד
const DEPTH = 100 // עומק (translateZ) לכל צעד
const SCALE_STEP = 0.08
const OPACITY_STEP = 0.24
const VISIBLE = 2.6 // מעבר לזה — הכרטיס מוסתר (כדי להסתיר את "הקפיצה" בלולאה)

/** מרחק חתום קצר ביותר סביב הלולאה, בטווח [-n/2, n/2) */
function signedWrap(x: number, n: number): number {
  let d = ((x % n) + n) % n
  if (d > n / 2) d -= n
  return d
}

/** קרוסלה אנכית אינסופית — גוללים מעלה/מטה, הכרטיסים מסתובבים וחוזרים בלולאה */
export function CardCarousel({ cards }: { cards: WalletCard[] }) {
  const navigate = useNavigate()
  const n = cards.length
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{ y: number; start: number } | null>(null)
  const moved = useRef(false)
  const stageRef = useRef<HTMLDivElement>(null)

  // איפוס המיקום כשרשימת הכרטיסים משתנה (סינון/חיפוש)
  const ids = cards.map((c) => c.id).join('|')
  useEffect(() => {
    setOffset(0)
  }, [ids])

  // גלגלת עכבר / טראקפד — מאזין לא-פסיבי כדי למנוע גלילת הדף
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    let snapTimer: number | undefined
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      setDragging(true)
      setOffset((o) => o + e.deltaY / SPACING)
      window.clearTimeout(snapTimer)
      snapTimer = window.setTimeout(() => {
        setDragging(false)
        setOffset((o) => Math.round(o))
      }, 150)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('wheel', onWheel)
      window.clearTimeout(snapTimer)
    }
  }, [])

  if (n === 0) return null

  function onPointerDown(e: React.PointerEvent) {
    drag.current = { y: e.clientY, start: offset }
    moved.current = false
    setDragging(true)
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // מזהה מצביע לא תקין (למשל בבדיקות) — ממשיכים בלי capture
    }
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return
    const dy = e.clientY - drag.current.y
    if (Math.abs(dy) > 6) moved.current = true
    setOffset(drag.current.start - dy / SPACING) // גרירה מעלה מקדמת קדימה
  }
  function endDrag() {
    if (!drag.current) return
    drag.current = null
    setDragging(false)
    setOffset((o) => Math.round(o)) // הצמדה לכרטיס הקרוב
  }

  function onCardClick(i: number, id: string) {
    if (moved.current) return // הייתה גרירה, לא לחיצה
    const d = signedWrap(i - offset, n)
    if (Math.abs(d) < 0.5) navigate(`/card/${id}`) // הכרטיס המרכזי — פתיחה
    else setOffset((o) => o + d) // כרטיס צדדי — הבא אותו למרכז
  }

  return (
    <>
      <div
        ref={stageRef}
        className={`carousel ${dragging ? 'is-dragging' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {cards.map((card, i) => {
          const d = signedWrap(i - offset, n)
          const abs = Math.abs(d)
          const hidden = abs > VISIBLE
          const isCenter = abs < 0.5
          return (
            <div
              key={card.id}
              className={`carousel-card ${isCenter ? 'is-center' : ''}`}
              style={{
                transform: `translate(-50%, -50%) translateY(${d * SPACING}px) translateZ(${-abs * DEPTH}px) rotateX(${-d * ANGLE}deg) scale(${Math.max(0.4, 1 - abs * SCALE_STEP)})`,
                opacity: hidden ? 0 : Math.max(0, 1 - abs * OPACITY_STEP),
                zIndex: 100 - Math.round(abs * 10),
                pointerEvents: hidden ? 'none' : 'auto',
              }}
              role="button"
              tabIndex={isCenter ? 0 : -1}
              aria-hidden={hidden}
              onClick={() => onCardClick(i, card.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isCenter) navigate(`/card/${card.id}`)
                else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setOffset((o) => Math.round(o) + 1)
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setOffset((o) => Math.round(o) - 1)
                }
              }}
            >
              <CardTile card={card} />
            </div>
          )
        })}
      </div>
      <p className="carousel-hint">החלק מעלה ומטה לדפדוף · הקש על הכרטיס לפתיחה</p>
    </>
  )
}
