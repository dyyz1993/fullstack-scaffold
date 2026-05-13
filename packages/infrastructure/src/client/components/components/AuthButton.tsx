import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export function AuthButton() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const user = useAuthStore(state => state.user)
  const logout = useAuthStore(state => state.logout)

  const handleLogout = () => {
    logout()
  }

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600" data-testid="auth-username">
          {user?.username}
        </span>
        <button
          onClick={handleLogout}
          data-testid="auth-logout"
          className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
        >
          Sign Out
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        to="/login"
        data-testid="auth-login"
        className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Sign In
      </Link>
      <Link
        to="/register"
        data-testid="auth-register"
        className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
      >
        Sign Up
      </Link>
    </div>
  )
}
