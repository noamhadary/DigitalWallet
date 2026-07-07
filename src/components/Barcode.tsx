import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'
import QRCode from 'qrcode'
import type { BarcodeFormat } from '../lib/types'

interface Props {
  value: string
  format?: BarcodeFormat
  height?: number
}

/** מציג ברקוד (CODE128 / EAN13) או קוד QR עבור ערך הכרטיס */
export function Barcode({ value, format = 'CODE128', height = 90 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!value) return
    if (format === 'QR') {
      if (canvasRef.current) {
        QRCode.toCanvas(canvasRef.current, value, {
          width: 180,
          margin: 1,
          color: { dark: '#1b1c1c', light: '#ffffff' },
        }).catch(() => {})
      }
      return
    }
    if (svgRef.current) {
      try {
        JsBarcode(svgRef.current, value, {
          format: format === 'EAN13' ? 'EAN13' : 'CODE128',
          height,
          displayValue: true,
          fontSize: 14,
          margin: 8,
          background: '#ffffff',
          lineColor: '#1b1c1c',
        })
      } catch {
        // ערך לא תואם לפורמט — לא מציגים ברקוד
      }
    }
  }, [value, format, height])

  if (!value) return null

  return (
    <div className="barcode">
      {format === 'QR' ? (
        <canvas ref={canvasRef} aria-label="קוד QR" />
      ) : (
        <svg ref={svgRef} aria-label="ברקוד" />
      )}
    </div>
  )
}
