import { Navigate } from 'react-router-dom'
import useAuthStore from '../../store/auth'

export function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

export function AdminRoute({ children }) {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!user) return null
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />
  return children
}