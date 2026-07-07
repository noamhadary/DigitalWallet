import { useRef, useState } from 'react'

interface Props {
  front: string
  back: string
  alt: string
}

/**
 * כרטיס דו-צדדי עם אפקט היפוך תלת-ממדי.
 * מתהפך בהקשה, בהחלקה אופקית (swipe) או במקלדת (Enter/רווח).
 */
export function FlipCard({ front, back, alt }: Props) {
  const [flipped, setFlipped] = useState(false)
  const toggle = () => setFlipped((f) => !f)
  const start = useRef<{ x: number; y: number } | null>(null)

  function onPointerDown(e: React.PointerEvent) {
    start.current = { x: e.clientX, y: e.clientY }
  }

  function onPointerUp(e: React.PointerEvent) {
    const s = start.current
    start.current = null
    if (!s) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    const isTap = Math.abs(dx) < 10 && Math.abs(dy) < 10
    const isHorizontalSwipe = Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)
    // הקשה או החלקה אופקית מהפכים; החלקה אנכית (גלילה) — לא
    if (isTap || isHorizontalSwipe) toggle()
  }

  return (
    <div className="flip">
      <div
        className={`flip__inner ${flipped ? 'is-flipped' : ''}`}
        role="button"
        tabIndex={0}
        aria-label={`${alt} — הקש או החלק להיפוך הכרטיס`}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            toggle()
          }
        }}
      >
        <div className="flip__face flip__front">
          <img src={front} alt={`חזית ${alt}`} draggable={false} />
        </div>
        <div className="flip__face flip__back">
          <img src={back} alt={`גב ${alt}`} draggable={false} />
        </div>
      </div>
      <button type="button" className="flip__hint" onClick={toggle}>
        ↻ הקש או החלק להיפוך · {flipped ? 'גב' : 'חזית'}
      </button>
    </div>
  )
}
