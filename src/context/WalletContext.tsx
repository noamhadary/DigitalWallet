import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { storage } from '../lib/storage'
import type { CardInput, WalletCard } from '../lib/types'

interface WalletState {
  cards: WalletCard[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  addCard: (input: CardInput) => Promise<WalletCard>
  updateCard: (id: string, input: CardInput) => Promise<WalletCard>
  deleteCard: (id: string) => Promise<void>
  toggleFavorite: (id: string, value: boolean) => Promise<void>
}

const WalletContext = createContext<WalletState | null>(null)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [cards, setCards] = useState<WalletCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setCards(await storage.list())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בטעינת הכרטיסים')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const addCard = useCallback(async (input: CardInput) => {
    const card = await storage.create(input)
    setCards((prev) => [card, ...prev])
    return card
  }, [])

  const updateCard = useCallback(async (id: string, input: CardInput) => {
    const card = await storage.update(id, input)
    setCards((prev) => prev.map((c) => (c.id === id ? card : c)))
    return card
  }, [])

  const deleteCard = useCallback(async (id: string) => {
    await storage.remove(id)
    setCards((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const toggleFavorite = useCallback(async (id: string, value: boolean) => {
    await storage.toggleFavorite(id, value)
    setCards((prev) =>
      prev
        .map((c) => (c.id === id ? { ...c, isFavorite: value } : c))
        .sort(
          (a, b) =>
            Number(b.isFavorite) - Number(a.isFavorite) || b.createdAt.localeCompare(a.createdAt),
        ),
    )
  }, [])

  return (
    <WalletContext.Provider
      value={{ cards, loading, error, refresh, addCard, updateCard, deleteCard, toggleFavorite }}
    >
      {children}
    </WalletContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWallet(): WalletState {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used within WalletProvider')
  return ctx
}
