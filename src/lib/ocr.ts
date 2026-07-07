import { isValidIsraeliId } from './validators'
import type { CardType } from './types'

/** פרטים שחולצו מהכרטיס באמצעות OCR */
export interface ExtractedInfo {
  holderName?: string
  cardNumber?: string
  details: Record<string, string>
  rawText: string
}

/** מריץ OCR (עברית + אנגלית) על תמונת הכרטיס ומחלץ פרטים לפי סוג */
export async function scanCardText(
  image: string,
  type: CardType,
  onProgress?: (progress: number) => void,
): Promise<ExtractedInfo> {
  // טעינה עצלה — tesseract.js נטען רק כשמפעילים סריקה בפועל
  const Tesseract = (await import('tesseract.js')).default
  const { data } = await Tesseract.recognize(image, 'heb+eng', {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) onProgress(m.progress)
    },
  })
  return parseCardText(data.text, type)
}

function pad(n: string): string {
  return n.length === 1 ? '0' + n : n
}

/** כל רצפי הספרות (מתעלם מרווחים/מקפים בין ספרות) */
function digitRuns(text: string): string[] {
  return [...text.matchAll(/\d[\d \-]{3,}\d/g)]
    .map((m) => m[0].replace(/\D/g, ''))
    .filter((s) => s.length >= 5)
}

/** תאריכים בפורמט DD/MM/YYYY */
function findDates(text: string): string[] {
  return [...text.matchAll(/\b(\d{1,2})[./\-](\d{1,2})[./\-](\d{2,4})\b/g)].map(
    (m) => `${pad(m[1])}/${pad(m[2])}/${m[3].length === 2 ? '20' + m[3] : m[3]}`,
  )
}

/** שורות כותרת/מנפיק נפוצות שאינן שם בעל הכרטיס */
const HEADER_RE = /מדינת|תעוד|רשיו|רישיו|משרד|כרטיס|מועדון|נהיג|ביטוח|בריאות|ministry|state of israel/i

/** מנסה לזהות שם בעברית — שורה עם 2+ מילים עבריות, ללא ספרות וללא כותרת */
function findHebrewName(text: string): string | undefined {
  const lines = text.split('\n').map((l) => l.trim())
  for (const line of lines) {
    if (/\d/.test(line) || HEADER_RE.test(line)) continue
    const words = line.split(/\s+/).filter((w) => /^[֐-׿'"־]{2,}$/.test(w))
    if (words.length >= 2) return words.slice(0, 3).join(' ')
  }
  return undefined
}

/** ניתוח הטקסט הגולמי לשדות מובנים לפי סוג הכרטיס */
export function parseCardText(text: string, type: CardType): ExtractedInfo {
  const details: Record<string, string> = {}
  const info: ExtractedInfo = { details, rawText: text }

  const runs = digitRuns(text)
  const dates = findDates(text)
  const name = findHebrewName(text)
  if (name) info.holderName = name

  // מספר תעודת זהות — רצף 9 ספרות תקין (ספרת ביקורת)
  const nineDigit = runs.filter((r) => r.length === 9)
  const validId = nineDigit.find(isValidIsraeliId) ?? nineDigit[0]

  // מספר כרטיס ארוך (אשראי/מועדון) — הרצף הארוך ביותר באורך 12–19
  const longRun = runs.filter((r) => r.length >= 12 && r.length <= 19).sort((a, b) => b.length - a.length)[0]

  // תוקף MM/YY (אשראי)
  const expiry = text.match(/\b(0[1-9]|1[0-2])[/\-](\d{2})\b/)

  switch (type) {
    case 'id':
      if (validId) details.idNumber = validId
      if (dates[0]) details.dateOfBirth = dates[0]
      if (dates[1]) details.issueDate = dates[1]
      break
    case 'license': {
      const licNum = runs.find((r) => r.length >= 7 && r.length <= 9)
      if (licNum) details.licenseNumber = licNum
      // בתוקף עד = התאריך המאוחר ביותר
      if (dates.length) {
        const latest = [...dates].sort((a, b) => toTime(b) - toTime(a))[0]
        details.validUntil = latest
      }
      break
    }
    case 'credit':
      if (longRun) info.cardNumber = longRun
      if (expiry) details.expiry = `${expiry[1]}/${expiry[2]}`
      if (/master/i.test(text)) details.network = 'Mastercard'
      else if (/visa/i.test(text)) details.network = 'Visa'
      break
    default:
      if (longRun) info.cardNumber = longRun
      else if (runs[0]) info.cardNumber = runs.sort((a, b) => b.length - a.length)[0]
      if (dates[0]) details.validUntil = dates[0]
  }

  return info
}

function toTime(d: string): number {
  const [dd, mm, yyyy] = d.split('/').map(Number)
  return new Date(yyyy, mm - 1, dd).getTime()
}
