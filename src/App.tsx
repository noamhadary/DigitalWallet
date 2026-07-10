import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { ProfileProvider } from './context/ProfileContext'
import { WalletProvider } from './context/WalletContext'
import { BottomNav } from './components/BottomNav'
import { WalletPage } from './pages/WalletPage'
import { AddCardPage } from './pages/AddCardPage'
import { CardDetailPage } from './pages/CardDetailPage'
import { SettingsPage } from './pages/SettingsPage'

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ProfileProvider>
          <WalletProvider>
            <div className="app-shell">
              <main className="app-main">
                <Routes>
                  <Route path="/" element={<WalletPage />} />
                  <Route path="/add" element={<AddCardPage />} />
                  <Route path="/edit/:id" element={<AddCardPage />} />
                  <Route path="/card/:id" element={<CardDetailPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
              <BottomNav />
            </div>
          </WalletProvider>
        </ProfileProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
