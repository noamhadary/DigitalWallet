import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export interface Profile {
  /** שם התצוגה של בעל הארנק (אופציונלי) */
  name: string
  /** תמונת פרופיל כ־data URL (אופציונלי) */
  avatar?: string
}

interface ProfileState {
  profile: Profile
  save: (next: Profile) => void
}

const ProfileContext = createContext<ProfileState | null>(null)
const KEY = 'digital-wallet:profile'

function read(): Profile {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Profile) : { name: '' }
  } catch {
    return { name: '' }
  }
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>(read)

  const value = useMemo<ProfileState>(
    () => ({
      profile,
      save(next) {
        setProfile(next)
        localStorage.setItem(KEY, JSON.stringify(next))
      },
    }),
    [profile],
  )

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProfile(): ProfileState {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider')
  return ctx
}
