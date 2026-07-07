/**
 * כלי סריקת כרטיסים — ללא תלות חיצונית.
 * - טעינת תמונה מקובץ / מצלמה
 * - זיהוי אוטומטי של גבולות הכרטיס (היטל שיפועים)
 * - יישור פרספקטיבה (homography) לחיתוך "מושלם" ביחס כרטיס אשראי
 */

export interface Point {
  x: number
  y: number
}
/** ארבע פינות בסדר: שמאל-עליון, ימין-עליון, ימין-תחתון, שמאל-תחתון */
export type Corners = [Point, Point, Point, Point]

/** יחס כרטיס אשראי סטנדרטי (ISO/IEC 7810 ID-1): 85.6 × 53.98 מ"מ */
export const CARD_RATIO = 85.6 / 53.98 // ≈ 1.586
export const OUTPUT_WIDTH = 1024
export const OUTPUT_HEIGHT = Math.round(OUTPUT_WIDTH / CARD_RATIO) // ≈ 646

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/** מצייר תמונה ל־canvas תוך הקטנה לרוחב מרבי — לשמירה על ביצועים */
export function imageToCanvas(img: HTMLImageElement, maxDim = 1400): HTMLCanvasElement {
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
  return canvas
}

/**
 * זיהוי אוטומטי של גבולות הכרטיס באמצעות היטל אנרגיית שיפוע (Sobel).
 * מתאים לכרטיס על רקע מנוגד; מחזיר מלבן צירי כנקודת פתיחה שהמשתמש יכול לכוונן.
 */
export function autoDetectCorners(canvas: HTMLCanvasElement): Corners {
  const { width: W, height: H } = canvas
  const ctx = canvas.getContext('2d')!
  const { data } = ctx.getImageData(0, 0, W, H)

  // גווני אפור
  const gray = new Float32Array(W * H)
  for (let i = 0; i < W * H; i++) {
    gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]
  }

  // אנרגיית שיפוע אופקית ואנכית (Sobel מפושט)
  const colEnergy = new Float32Array(W) // עוצמת קצוות אנכיים לכל עמודה
  const rowEnergy = new Float32Array(H) // עוצמת קצוות אופקיים לכל שורה
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const gx = Math.abs(gray[y * W + x + 1] - gray[y * W + x - 1])
      const gy = Math.abs(gray[(y + 1) * W + x] - gray[(y - 1) * W + x])
      colEnergy[x] += gx
      rowEnergy[y] += gy
    }
  }

  const insetX = findEdges(colEnergy, W)
  const insetY = findEdges(rowEnergy, H)

  return [
    { x: insetX.lo, y: insetY.lo },
    { x: insetX.hi, y: insetY.lo },
    { x: insetX.hi, y: insetY.hi },
    { x: insetX.lo, y: insetY.hi },
  ]
}

/** מאתר את שני הקצוות החזקים ביותר (שמאל/ימין או עליון/תחתון) של האובייקט */
function findEdges(energy: Float32Array, size: number): { lo: number; hi: number } {
  const margin = Math.round(size * 0.03)
  let max = 0
  for (let i = margin; i < size - margin; i++) if (energy[i] > max) max = energy[i]
  const threshold = max * 0.45

  let lo = Math.round(size * 0.08)
  for (let i = margin; i < size / 2; i++) {
    if (energy[i] > threshold) {
      lo = i
      break
    }
  }
  let hi = Math.round(size * 0.92)
  for (let i = size - margin - 1; i > size / 2; i--) {
    if (energy[i] > threshold) {
      hi = i
      break
    }
  }
  if (hi - lo < size * 0.25) {
    // זיהוי חלש — ברירת מחדל למלבן פנימי
    return { lo: Math.round(size * 0.08), hi: Math.round(size * 0.92) }
  }
  return { lo, hi }
}

/**
 * יישור פרספקטיבה: ממפה את מרובע המקור (הפינות) למלבן יעד ישר.
 * מבצע מיפוי הפוך עם דגימה בי־לינארית לתוצאה חלקה.
 */
export function warpToCard(
  source: HTMLCanvasElement,
  corners: Corners,
  outW = OUTPUT_WIDTH,
  outH = OUTPUT_HEIGHT,
): HTMLCanvasElement {
  const srcCtx = source.getContext('2d')!
  const srcImg = srcCtx.getImageData(0, 0, source.width, source.height)
  const src = srcImg.data
  const sw = source.width
  const sh = source.height

  // homography הממפה קואורדינטות יעד (מלבן) -> מקור (מרובע)
  const dst: Corners = [
    { x: 0, y: 0 },
    { x: outW, y: 0 },
    { x: outW, y: outH },
    { x: 0, y: outH },
  ]
  const H = solveHomography(dst, corners)

  const out = document.createElement('canvas')
  out.width = outW
  out.height = outH
  const outCtx = out.getContext('2d')!
  const outImg = outCtx.createImageData(outW, outH)
  const o = outImg.data

  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const denom = H[6] * x + H[7] * y + 1
      const u = (H[0] * x + H[1] * y + H[2]) / denom
      const v = (H[3] * x + H[4] * y + H[5]) / denom
      const oi = (y * outW + x) * 4
      if (u < 0 || v < 0 || u >= sw - 1 || v >= sh - 1) {
        o[oi] = o[oi + 1] = o[oi + 2] = 255
        o[oi + 3] = 255
        continue
      }
      // דגימה בי־לינארית
      const x0 = Math.floor(u)
      const y0 = Math.floor(v)
      const fx = u - x0
      const fy = v - y0
      for (let c = 0; c < 3; c++) {
        const p00 = src[(y0 * sw + x0) * 4 + c]
        const p10 = src[(y0 * sw + x0 + 1) * 4 + c]
        const p01 = src[((y0 + 1) * sw + x0) * 4 + c]
        const p11 = src[((y0 + 1) * sw + x0 + 1) * 4 + c]
        const top = p00 + (p10 - p00) * fx
        const bot = p01 + (p11 - p01) * fx
        o[oi + c] = top + (bot - top) * fy
      }
      o[oi + 3] = 255
    }
  }
  outCtx.putImageData(outImg, 0, 0)
  return out
}

/**
 * פותר homography הממפה 4 נקודות מקור ל־4 נקודות יעד.
 * מחזיר 8 מקדמים [a,b,c,d,e,f,g,h] כאשר:
 *   X = (a·x + b·y + c) / (g·x + h·y + 1)
 *   Y = (d·x + e·y + f) / (g·x + h·y + 1)
 */
function solveHomography(from: Corners, to: Corners): number[] {
  const A: number[][] = []
  const b: number[] = []
  for (let i = 0; i < 4; i++) {
    const { x, y } = from[i]
    const { x: X, y: Y } = to[i]
    A.push([x, y, 1, 0, 0, 0, -x * X, -y * X])
    b.push(X)
    A.push([0, 0, 0, x, y, 1, -x * Y, -y * Y])
    b.push(Y)
  }
  return gaussianSolve(A, b)
}

/** פתרון מערכת לינארית 8×8 באלימינציית גאוס עם pivoting חלקי */
function gaussianSolve(A: number[][], b: number[]): number[] {
  const n = b.length
  const M = A.map((row, i) => [...row, b[i]])
  for (let col = 0; col < n; col++) {
    let pivot = col
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r
    }
    ;[M[col], M[pivot]] = [M[pivot], M[col]]
    const pv = M[col][col] || 1e-9
    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const factor = M[r][col] / pv
      for (let c = col; c <= n; c++) M[r][c] -= factor * M[col][c]
    }
  }
  return M.map((row, i) => row[n] / (row[i] || 1e-9))
}
