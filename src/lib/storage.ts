import { supabase, isSupabaseConfigured } from './supabase'
import type { CardInput, WalletCard } from './types'

/**
 * שכבת אחסון אחידה.
 * אם Supabase מוגדר — הנתונים נשמרים בענן (עם RLS לפי משתמש).
 * אחרת — נשמרים מקומית ב־localStorage כדי שהאפליקציה תרוץ מיד.
 */

const LOCAL_KEY = 'digital-wallet:cards'

// ---------- מיפוי בין שורת DB לאובייקט האפליקציה ----------
type Row = {
  id: string
  type: WalletCard['type']
  title: string
  issuer: string | null
  holder_name: string | null
  card_number: string | null
  barcode_data: string | null
  barcode_format: WalletCard['barcodeFormat']
  front_color: string
  image_data: string | null
  image_back_data: string | null
  details: Record<string, string>
  notes: string | null
  is_favorite: boolean
  created_at: string
  updated_at: string
}

function rowToCard(r: Row): WalletCard {
  return {
    id: r.id,
    type: r.type,
    title: r.title,
    issuer: r.issuer ?? undefined,
    holderName: r.holder_name ?? undefined,
    cardNumber: r.card_number ?? undefined,
    barcodeData: r.barcode_data ?? undefined,
    barcodeFormat: r.barcode_format ?? 'CODE128',
    frontColor: r.front_color,
    imageData: r.image_data ?? undefined,
    imageBackData: r.image_back_data ?? undefined,
    details: r.details ?? {},
    notes: r.notes ?? undefined,
    isFavorite: r.is_favorite,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function cardToRow(input: CardInput, userId: string) {
  return {
    user_id: userId,
    type: input.type,
    title: input.title,
    issuer: input.issuer ?? null,
    holder_name: input.holderName ?? null,
    card_number: input.cardNumber ?? null,
    barcode_data: input.barcodeData ?? null,
    barcode_format: input.barcodeFormat ?? 'CODE128',
    front_color: input.frontColor,
    image_data: input.imageData ?? null,
    image_back_data: input.imageBackData ?? null,
    details: input.details ?? {},
    notes: input.notes ?? null,
    is_favorite: input.isFavorite,
  }
}

// ---------- מצב מקומי ----------
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

function uid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'c_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// ---------- API ציבורי ----------
export const storage = {
  usingCloud: isSupabaseConfigured,

  async list(): Promise<WalletCard[]> {
    if (supabase) {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return []
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .order('is_favorite', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data as Row[]).map(rowToCard)
    }
    return readLocal().sort(
      (a, b) => Number(b.isFavorite) - Number(a.isFavorite) || b.createdAt.localeCompare(a.createdAt),
    )
  },

  async get(id: string): Promise<WalletCard | null> {
    if (supabase) {
      const { data, error } = await supabase.from('cards').select('*').eq('id', id).single()
      if (error) return null
      return rowToCard(data as Row)
    }
    return readLocal().find((c) => c.id === id) ?? null
  },

  async create(input: CardInput): Promise<WalletCard> {
    if (supabase) {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData.user?.id
      if (!userId) throw new Error('נדרשת התחברות')
      const { data, error } = await supabase
        .from('cards')
        .insert(cardToRow(input, userId))
        .select('*')
        .single()
      if (error) throw error
      return rowToCard(data as Row)
    }
    const now = new Date().toISOString()
    const card: WalletCard = { ...input, id: uid(), createdAt: now, updatedAt: now }
    const cards = readLocal()
    cards.push(card)
    writeLocal(cards)
    return card
  },

  async update(id: string, input: CardInput): Promise<WalletCard> {
    if (supabase) {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData.user?.id
      if (!userId) throw new Error('נדרשת התחברות')
      const { data, error } = await supabase
        .from('cards')
        .update(cardToRow(input, userId))
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return rowToCard(data as Row)
    }
    const cards = readLocal()
    const idx = cards.findIndex((c) => c.id === id)
    if (idx === -1) throw new Error('כרטיס לא נמצא')
    const updated: WalletCard = { ...cards[idx], ...input, updatedAt: new Date().toISOString() }
    cards[idx] = updated
    writeLocal(cards)
    return updated
  },

  async remove(id: string): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from('cards').delete().eq('id', id)
      if (error) throw error
      return
    }
    writeLocal(readLocal().filter((c) => c.id !== id))
  },

  async toggleFavorite(id: string, value: boolean): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from('cards').update({ is_favorite: value }).eq('id', id)
      if (error) throw error
      return
    }
    const cards = readLocal()
    const idx = cards.findIndex((c) => c.id === id)
    if (idx !== -1) {
      cards[idx].isFavorite = value
      cards[idx].updatedAt = new Date().toISOString()
      writeLocal(cards)
    }
  },
}
