import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { LogIn } from 'lucide-react'
import { useAuthStore } from '@client/stores/authStore'
import { usePreset } from '../contexts/PresetContext'

const DEMO_CREDENTIALS: Record<string, { email: string; password: string; name: string }> = {
  todo: { email: 'demo@biomimic.app', password: 'demo123', name: 'Demo User' },
  plugin: { email: 'developer@pluginhub.io', password: 'dev123', name: 'Plugin Developer' },
  ecommerce: { email: 'shopper@shopmart.com', password: 'shop123', name: 'Shopper' },
  community: { email: 'member@community.dev', password: 'member123', name: 'Community Member' },
  saas: { email: 'admin@biomimic.app', password: 'admin123', name: 'Admin' },
}

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const login = useAuthStore(state => state.login)
  const loading = useAuthStore(state => state.loading)
  const error = useAuthStore(state => state.error)
  const clearError = useAuthStore(state => state.clearError)

  const preset = usePreset()
  const creds = DEMO_CREDENTIALS[preset] ?? DEMO_CREDENTIALS.todo

  const [username, setUsername] = useState(creds.email)
  const [password, setPassword] = useState(creds.password)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await login(username, password)
    const state = useAuthStore.getState()
    if (state.isAuthenticated) {
      navigate('/todos')
    }
  }

  return (
    <>
      <Helmet>
        <title>Login - Biomimic App</title>
      </Helmet>
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
        <div className="w-full max-w-md" data-testid="login-page">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
                <LogIn className="w-6 h-6 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
              <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={e => {
                    setUsername(e.target.value)
                    if (error) clearError()
                  }}
                  placeholder="Enter your username"
                  required
                  data-testid="login-username"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value)
                    if (error) clearError()
                  }}
                  placeholder="Enter your password"
                  required
                  data-testid="login-password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {error && (
                <div
                  className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
                  data-testid="login-error"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                data-testid="login-submit"
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <p className="mt-4 text-center text-sm text-gray-500">
              Don&apos;t have an account?{' '}
              <Link
                to="/register"
                className="text-blue-600 hover:text-blue-700 font-medium"
                data-testid="login-register-link"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
