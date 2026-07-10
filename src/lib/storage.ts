import type { CardInput, WalletCard } from './types'

/**
 * שכבת אחסון — מקומית בלבד (localStorage). ראו docs/adr/0002-local-only-storage.md.
 * שום נתון אינו עוזב את המכשיר.
 */

const LOCAL_KEY = 'digital-wallet:cards'

function readLocal(): WalletCard[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? (JSON.parse(raw) as WalletCard[]) : []
  } catch {
    return []
  }
}

function writeLocal(cards: WalletCard[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(cards))
}

/** מועדפים קודם, ואז לפי תאריך יצירה יורד */
function sortCards(cards: WalletCard[]): WalletCard[] {
  return [...cards].sort(
    (a, b) => Number(b.isFavorite) - Number(a.isFavorite) || b.createdAt.localeCompare(a.createdAt),
  )
}

function uid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'c_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export const storage = {
  async list(): Promise<WalletCard[]> {
    return sortCards(readLocal())
  },

  async get(id: string): Promise<WalletCard | null> {
    return readLocal().find((c) => c.id === id) ?? null
  },

  async create(input: CardInput): Promise<WalletCard> {
    const now = new Date().toISOString()
    const card: WalletCard = { ...input, id: uid(), createdAt: now, updatedAt: now }
    const cards = readLocal()
    cards.push(card)
    writeLocal(cards)
    return card
  },

  async update(id: string, input: CardInput): Promise<WalletCard> {
    const cards = readLocal()
    const idx = cards.findIndex((c) => c.id === id)
    if (idx === -1) throw new Error('כרטיס לא נמצא')
    const updated: WalletCard = { ...cards[idx], ...input, updatedAt: new Date().toISOString() }
    cards[idx] = updated
    writeLocal(cards)
    return updated
  },

  async remove(id: string): Promise<void> {
    writeLocal(readLocal().filter((c) => c.id !== id))
  },

  async toggleFavorite(id: string, value: boolean): Promise<void> {
    const cards = readLocal()
    const idx = cards.findIndex((c) => c.id === id)
    if (idx !== -1) {
      cards[idx].isFavorite = value
      cards[idx].updatedAt = new Date().toISOString()
      writeLocal(cards)
    }
  },

  /** מחליף את כל הכרטיסים — לשימוש ייבוא גיבוי */
  async replaceAll(cards: WalletCard[]): Promise<void> {
    writeLocal(cards)
  },
}
