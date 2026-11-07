import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { createContext, useContext, useEffect, useState, lazy, Suspense } from 'react'

const AdminPage = lazy(() => import('./pages/AdminPage'))
// Logged-out front door + read-only demo: split out of the main bundle.
const LandingPage = lazy(() => import('./pages/LandingPage'))
const DemoPage = lazy(() => import('./pages/demo/DemoPage'))
const DemoRecipePage = lazy(() => import('./pages/demo/DemoRecipePage'))
const DemoCookPage = lazy(() => import('./pages/demo/DemoCookPage'))
import { AuthProvider, useAuth } from './hooks/useAuth'
import { CurrencyProvider } from './hooks/useCurrency'
import HomePage from './pages/HomePage'
import RecipePage from './pages/RecipePage'
import CookModePage from './pages/CookModePage'
import ImportPage from './pages/ImportPage'
import EditRecipePage from './pages/EditRecipePage'
import SharePage from './pages/SharePage'
import InvitePage from './pages/InvitePage'
import ProfilePage from './pages/ProfilePage'
import AuthPage from './pages/AuthPage'
import AuthCompletePage from './pages/AuthCompletePage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import SearchPage from './pages/SearchPage'
import LeaderboardPage from './pages/LeaderboardPage'
import NeedsAttentionPage from './pages/NeedsAttentionPage'
import PublicProfilePage from './pages/PublicProfilePage'
import ChefsPage from './pages/ChefsPage'
import TermsPage from './pages/TermsPage'
import PrivacyPage from './pages/PrivacyPage'
import NotFoundPage from './pages/NotFoundPage'
import Onboarding from './components/Onboarding'

export const OnboardingContext = createContext<{ open: () => void } | null>(null)
export function useOnboarding() { return useContext(OnboardingContext) }

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="page-shell"><div className="page-main" /></div>
  if (!user) return <Navigate to="/auth" replace />
  return <>{children}</>
}

const blank = <div className="page-shell"><div className="page-main" /></div>

/** "/" is the recipe box when signed in, the landing page otherwise. */
function HomeOrLanding() {
  const { user, loading } = useAuth()
  if (loading) return blank
  if (user) return <HomePage />
  return <Suspense fallback={blank}><LandingPage /></Suspense>
}

function AppRoutes() {
  const { user } = useAuth()
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    if (user && !localStorage.getItem('onboarding-complete')) {
      setShowOnboarding(true)
    }
  }, [user])

  const openOnboarding = () => setShowOnboarding(true)
  const closeOnboarding = () => {
    localStorage.setItem('onboarding-complete', '1')
    setShowOnboarding(false)
  }

  return (
    <OnboardingContext.Provider value={{ open: openOnboarding }}>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/auth/complete" element={<AuthCompletePage />} />
          <Route path="/auth/verify" element={<AuthPage />} />
          <Route path="/api/auth/verify" element={<AuthPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/share/:token" element={<SharePage />} />
          <Route path="/invite/:token" element={<InvitePage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/" element={<HomeOrLanding />} />
          <Route path="/demo" element={<Suspense fallback={blank}><DemoPage /></Suspense>} />
          <Route path="/demo/recipe/:id" element={<Suspense fallback={blank}><DemoRecipePage /></Suspense>} />
          <Route path="/demo/recipe/:id/cook" element={<Suspense fallback={blank}><DemoCookPage /></Suspense>} />
          <Route path="/recipe/new" element={<ProtectedRoute><EditRecipePage /></ProtectedRoute>} />
          <Route path="/recipe/:id" element={<ProtectedRoute><RecipePage /></ProtectedRoute>} />
          <Route path="/recipe/:id/edit" element={<ProtectedRoute><EditRecipePage /></ProtectedRoute>} />
          <Route path="/recipe/:id/cook" element={<ProtectedRoute><CookModePage /></ProtectedRoute>} />
          <Route path="/explore" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><LeaderboardPage /></ProtectedRoute>} />
          <Route path="/import" element={<ProtectedRoute><ImportPage /></ProtectedRoute>} />
          <Route path="/needs-attention" element={<ProtectedRoute><NeedsAttentionPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/user/:id" element={<ProtectedRoute><PublicProfilePage /></ProtectedRoute>} />
          <Route path="/chefs" element={<ProtectedRoute><ChefsPage /></ProtectedRoute>} />
          <Route path="/admin" element={
            <ProtectedRoute>
              <Suspense fallback={<div className="page-shell"><div className="page-main" /></div>}>
                <AdminPage />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
      {showOnboarding && <Onboarding onClose={closeOnboarding} />}
    </OnboardingContext.Provider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <CurrencyProvider>
        <AppRoutes />
      </CurrencyProvider>
    </AuthProvider>
  )
}
