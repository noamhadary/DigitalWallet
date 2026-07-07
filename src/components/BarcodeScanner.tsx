import { useEffect, useRef, useState } from 'react'

interface Props {
  onResult: (value: string) => void
  onClose: () => void
}

// טיפוס מינימלי כדי להימנע מ־import סטטי של הספרייה הכבדה
interface ScannerControls {
  stop: () => void
}

/** סורק ברקוד/QR חי מהמצלמה — מחזיר את הערך המפוענח */
export function BarcodeScanner({ onResult, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<ScannerControls | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    // טעינה עצלה — @zxing נטען רק כשפותחים את הסורק
    import('@zxing/browser')
      .then(({ BrowserMultiFormatReader }) => {
        if (cancelled || !videoRef.current) return
        const reader = new BrowserMultiFormatReader()
        return reader.decodeFromVideoDevice(undefined, videoRef.current, (result, _err, controls) => {
          controlsRef.current = controls
          if (cancelled) {
            controls.stop()
            return
          }
          if (result) {
            const text = result.getText()
            if (text) {
              controls.stop()
              onResult(text)
            }
          }
        })
      })
      .catch(() => setError('לא ניתן לגשת למצלמה'))

    return () => {
      cancelled = true
      controlsRef.current?.stop()
    }
  }, [onResult])

  return (
    <div className="scanner">
      <header className="scanner__bar">
        <button className="btn btn--ghost btn--icon scanner__x" onClick={onClose} aria-label="סגירה">✕</button>
        <span className="scanner__title">סריקת ברקוד</span>
        <span style={{ width: 44 }} />
      </header>

      {error && <div className="alert alert--error scanner__alert">{error}</div>}

      <div className="scanner__capture">
        <div className="scanner__viewport">
          <video ref={videoRef} playsInline muted />
          <div className="barcode-reticle" aria-hidden />
        </div>
        <p className="scanner__hint">כוון את הברקוד או קוד ה־QR של הכרטיס אל תוך המסגרת.</p>
      </div>
    </div>
  )
}
