import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './auth'
import { FullPageSpinner } from './components/ui'
import Cast from './pages/Cast'
import Admin from './pages/Admin'
import Auth from './pages/Auth'
import Landing from './pages/Landing'
import Lobby from './pages/Lobby'
import NotFound from './pages/NotFound'
import Room from './pages/Room'

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullPageSpinner label="Checking your login" />
  if (!user) return <Navigate to="/auth" replace state={{ from: location.pathname }} />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/lobby" element={<RequireAuth><Lobby /></RequireAuth>} />
      <Route path="/room/:code" element={<RequireAuth><Room /></RequireAuth>} />
      <Route path="/cast" element={<Cast />} />
      <Route path="/admin" element={<RequireAuth><Admin /></RequireAuth>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
