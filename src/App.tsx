import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import HomePage from './pages/HomePage'
import RecipePage from './pages/RecipePage'
import CookModePage from './pages/CookModePage'
import ImportPage from './pages/ImportPage'
import EditRecipePage from './pages/EditRecipePage'
import SharePage from './pages/SharePage'
import ProfilePage from './pages/ProfilePage'
import AuthPage from './pages/AuthPage'
import NeedsAttentionPage from './pages/NeedsAttentionPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="page-shell"><div className="page-main" /></div>
  if (!user) return <Navigate to="/auth" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/auth/verify" element={<AuthPage />} />
          <Route path="/api/auth/verify" element={<AuthPage />} />
          <Route path="/share/:token" element={<SharePage />} />
          <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/recipe/new" element={<ProtectedRoute><EditRecipePage /></ProtectedRoute>} />
          <Route path="/recipe/:id" element={<ProtectedRoute><RecipePage /></ProtectedRoute>} />
          <Route path="/recipe/:id/edit" element={<ProtectedRoute><EditRecipePage /></ProtectedRoute>} />
          <Route path="/recipe/:id/cook" element={<ProtectedRoute><CookModePage /></ProtectedRoute>} />
          <Route path="/import" element={<ProtectedRoute><ImportPage /></ProtectedRoute>} />
          <Route path="/needs-attention" element={<ProtectedRoute><NeedsAttentionPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
