import { useCallback, useEffect, useRef, useState } from 'react'
import {
  autoDetectCorners,
  fileToDataUrl,
  imageToCanvas,
  loadImage,
  warpToCard,
  type Corners,
  type Point,
} from '../lib/imageScan'
import { scanCardText, type ExtractedInfo } from '../lib/ocr'
import type { CardType } from '../lib/types'

type Stage = 'capture' | 'adjust' | 'preview'

interface Props {
  cardType: CardType
  onDone: (dataUrl: string, extracted?: ExtractedInfo) => void
  onClose: () => void
}

/** סורק כרטיסים: צילום/העלאה → זיהוי גבולות אוטומטי → יישור פרספקטיבה → OCR למילוי שדות */
export function CardScanner({ cardType, onDone, onClose }: Props) {
  const [stage, setStage] = useState<Stage>('capture')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)

  // OCR
  const [ocrBusy, setOcrBusy] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [ocrInfo, setOcrInfo] = useState<ExtractedInfo | null>(null)

  // מצלמה חיה
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraOn, setCameraOn] = useState(false)

  // שלב הכוונון
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const [corners, setCorners] = useState<Corners | null>(null)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const displayRef = useRef<{ scale: number; w: number; h: number }>({ scale: 1, w: 0, h: 0 })

  // ---------- מצלמה ----------
  const startCamera = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraOn(true)
    } catch {
      setError('לא ניתן לגשת למצלמה. ניתן להעלות תמונה במקום.')
    }
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCameraOn(false)
  }, [])

  useEffect(() => () => stopCamera(), [stopCamera])

  // ---------- עיבוד תמונה שנקלטה ----------
  const processImage = useCallback(async (dataUrl: string) => {
    try {
      const img = await loadImage(dataUrl)
      const canvas = imageToCanvas(img)
      sourceCanvasRef.current = canvas
      setCorners(autoDetectCorners(canvas))
      setStage('adjust')
    } catch {
      setError('שגיאה בטעינת התמונה')
    }
  }, [])

  const capturePhoto = useCallback(async () => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')!.drawImage(video, 0, 0)
    stopCamera()
    await processImage(canvas.toDataURL('image/jpeg', 0.92))
  }, [processImage, stopCamera])

  const onFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return
      stopCamera()
      await processImage(await fileToDataUrl(file))
    },
    [processImage, stopCamera],
  )

  // ---------- ציור שלב הכוונון ----------
  useEffect(() => {
    if (stage !== 'adjust' || !sourceCanvasRef.current || !overlayRef.current || !corners) return
    const src = sourceCanvasRef.current
    const overlay = overlayRef.current
    const maxW = Math.min(overlay.parentElement?.clientWidth ?? 360, 420)
    const scale = maxW / src.width
    const w = Math.round(src.width * scale)
    const h = Math.round(src.height * scale)
    displayRef.current = { scale, w, h }
    overlay.width = w
    overlay.height = h

    const ctx = overlay.getContext('2d')!
    ctx.clearRect(0, 0, w, h)
    ctx.drawImage(src, 0, 0, w, h)

    // הצללה מחוץ למרובע
    const pts = corners.map((p) => ({ x: p.x * scale, y: p.y * scale }))
    ctx.save()
    ctx.fillStyle = 'rgba(15,16,17,0.55)'
    ctx.beginPath()
    ctx.rect(0, 0, w, h)
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i].x, pts[i].y)
    ctx.closePath()
    ctx.fill('evenodd')
    ctx.restore()

    // מסגרת + פינות
    ctx.strokeStyle = '#c1c7cb'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    pts.forEach((p) => ctx.lineTo(p.x, p.y))
    ctx.closePath()
    ctx.stroke()

    pts.forEach((p) => {
      ctx.beginPath()
      ctx.arc(p.x, p.y, 11, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.95)'
      ctx.fill()
      ctx.lineWidth = 3
      ctx.strokeStyle = '#595f63'
      ctx.stroke()
    })
  }, [stage, corners])

  // ---------- גרירת פינות ----------
  function eventPoint(e: React.PointerEvent): Point {
    const rect = overlayRef.current!.getBoundingClientRect()
    const { scale } = displayRef.current
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale,
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!corners) return
    const p = eventPoint(e)
    let nearest = 0
    let best = Infinity
    corners.forEach((c, i) => {
      const d = (c.x - p.x) ** 2 + (c.y - p.y) ** 2
      if (d < best) {
        best = d
        nearest = i
      }
    })
    setDragIdx(nearest)
    overlayRef.current?.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (dragIdx === null || !corners || !sourceCanvasRef.current) return
    const p = eventPoint(e)
    const src = sourceCanvasRef.current
    const clamped = {
      x: Math.max(0, Math.min(src.width, p.x)),
      y: Math.max(0, Math.min(src.height, p.y)),
    }
    setCorners(corners.map((c, i) => (i === dragIdx ? clamped : c)) as Corners)
  }

  function onPointerUp() {
    setDragIdx(null)
  }

  // ---------- יישור, חיתוך ו־OCR ----------
  function confirmCrop() {
    if (!sourceCanvasRef.current || !corners) return
    const warped = warpToCard(sourceCanvasRef.current, corners)
    const url = warped.toDataURL('image/jpeg', 0.85)
    setResult(url)
    setStage('preview')
    runOcr(url)
  }

  async function runOcr(url: string) {
    setOcrBusy(true)
    setOcrProgress(0)
    setOcrInfo(null)
    try {
      const info = await scanCardText(url, cardType, (p) => setOcrProgress(p))
      setOcrInfo(info)
    } catch {
      // אם ה־OCR נכשל — התמונה עדיין נשמרת, פשוט בלי מילוי אוטומטי
    } finally {
      setOcrBusy(false)
    }
  }

  /** סיכום קצר של השדות שזוהו */
  function ocrSummary(info: ExtractedInfo): string[] {
    const out: string[] = []
    if (info.holderName) out.push(`שם: ${info.holderName}`)
    if (info.cardNumber) out.push(`מספר: ${info.cardNumber}`)
    for (const [k, v] of Object.entries(info.details)) out.push(`${labelFor(k)}: ${v}`)
    return out
  }

  return (
    <div className="scanner">
      <header className="scanner__bar">
        <button className="btn btn--ghost btn--icon scanner__x" onClick={onClose} aria-label="סגירה">✕</button>
        <span className="scanner__title">
          {stage === 'capture' ? 'צילום כרטיס' : stage === 'adjust' ? 'התאמת פינות' : 'תצוגה מקדימה'}
        </span>
        <span style={{ width: 44 }} />
      </header>

      {error && <div className="alert alert--error scanner__alert">{error}</div>}

      {/* שלב 1 — צילום / העלאה */}
      {stage === 'capture' && (
        <div className="scanner__capture">
          <div className="scanner__viewport">
            <video ref={videoRef} playsInline muted className={cameraOn ? '' : 'is-hidden'} />
            {!cameraOn && (
              <div className="scanner__placeholder">
                <div className="scanner__frame" aria-hidden />
                <p>מקם את הכרטיס בתוך המסגרת וצלם, או העלה תמונה קיימת.</p>
              </div>
            )}
            {cameraOn && <div className="scanner__frame scanner__frame--live" aria-hidden />}
          </div>

          <div className="scanner__actions">
            {!cameraOn ? (
              <button className="btn btn--primary btn--block" onClick={startCamera}>📷 הפעלת מצלמה</button>
            ) : (
              <button className="btn btn--primary btn--block scanner__shutter" onClick={capturePhoto}>
                צלם
              </button>
            )}
            <label className="btn btn--ghost btn--block">
              🖼️ העלאת תמונה
              <input
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={(e) => onFile(e.target.files?.[0])}
              />
            </label>
          </div>
        </div>
      )}

      {/* שלב 2 — כוונון פינות */}
      {stage === 'adjust' && (
        <div className="scanner__adjust">
          <p className="scanner__hint">✓ גבולות הכרטיס זוהו אוטומטית. אפשר לגרור את הפינות לדיוק, או לצלם מחדש.</p>
          <div className="scanner__canvas-wrap">
            <canvas
              ref={overlayRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              style={{ touchAction: 'none' }}
            />
          </div>
          <div className="scanner__actions">
            <button className="btn btn--ghost" onClick={() => setStage('capture')}>צילום מחדש</button>
            <button className="btn btn--primary" onClick={confirmCrop}>יישור וחיתוך ›</button>
          </div>
        </div>
      )}

      {/* שלב 3 — תצוגה מקדימה + זיהוי טקסט */}
      {stage === 'preview' && result && (
        <div className="scanner__preview">
          <img src={result} alt="כרטיס חתוך" className="scanner__result" />

          {ocrBusy && (
            <div className="ocr-box">
              <div className="ocr-box__title">🔎 מזהה פרטים על הכרטיס…</div>
              <div className="ocr-bar">
                <div className="ocr-bar__fill" style={{ width: `${Math.round(ocrProgress * 100)}%` }} />
              </div>
            </div>
          )}

          {!ocrBusy && ocrInfo && ocrSummary(ocrInfo).length > 0 && (
            <div className="ocr-box ocr-box--ok">
              <div className="ocr-box__title">✓ זוהו פרטים — ימולאו בשדות</div>
              <ul className="ocr-list">
                {ocrSummary(ocrInfo).map((s, i) => (
                  <li key={i} dir="auto">{s}</li>
                ))}
              </ul>
            </div>
          )}

          {!ocrBusy && ocrInfo && ocrSummary(ocrInfo).length === 0 && (
            <div className="ocr-box">לא זוהו פרטים אוטומטית — אפשר למלא ידנית.</div>
          )}

          <div className="scanner__actions">
            <button className="btn btn--ghost" onClick={() => setStage('adjust')}>חזרה לכוונון</button>
            <button
              className="btn btn--primary"
              disabled={ocrBusy}
              onClick={() => onDone(result, ocrInfo ?? undefined)}
            >
              {ocrBusy ? 'מזהה…' : 'שמירה ומילוי שדות'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** תוויות בעברית למפתחות השדות שזוהו */
function labelFor(key: string): string {
  const map: Record<string, string> = {
    idNumber: 'ת.ז',
    dateOfBirth: 'תאריך לידה',
    issueDate: 'תאריך הנפקה',
    licenseNumber: 'מספר רשיון',
    validUntil: 'בתוקף עד',
    expiry: 'תוקף',
    network: 'רשת',
    categories: 'דרגות',
  }
  return map[key] ?? key
}
