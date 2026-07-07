import { useState } from 'react'

interface Props {
  front: string
  back: string
  alt: string
}

/** כרטיס דו-צדדי עם אפקט היפוך תלת-ממדי — כל לחיצה מסובבת לצד השני */
export function FlipCard({ front, back, alt }: Props) {
  const [flipped, setFlipped] = useState(false)
  const toggle = () => setFlipped((f) => !f)

  return (
    <div className="flip">
      <div
        className={`flip__inner ${flipped ? 'is-flipped' : ''}`}
        onClick={toggle}
        role="button"
        tabIndex={0}
        aria-label={`${alt} — הקש להיפוך הכרטיס`}
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
        ↻ הקש להיפוך · {flipped ? 'גב' : 'חזית'}
      </button>
    </div>
  )
}
