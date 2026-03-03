import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '../api/auth'
import { getMe } from '../api/user'
import useAuthStore from '../store/auth'

export default function Login() {
  const navigate = useNavigate()
  const loginStore = useAuthStore((s) => s.login)

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data: tokens } = await login(form.email, form.password)
      // 토큰 저장 후 유저 정보 fetch
      localStorage.setItem('access_token', tokens.access_token)
      localStorage.setItem('refresh_token', tokens.refresh_token)
      const { data: user } = await getMe()
      loginStore(tokens, user)
      navigate(user.role === 'admin' ? '/admin/users' : '/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail ?? '로그인에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
      {/* 배경 그리드 */}
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#4f9cf9 1px, transparent 1px), linear-gradient(90deg, #4f9cf9 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="w-full max-w-sm animate-fade-in">
        {/* 로고 */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="font-mono text-accent-blue text-2xl font-semibold">BOJ</span>
            <span className="text-bg-border text-2xl">/</span>
            <span className="font-mono text-text-secondary text-2xl">rec</span>
          </div>
          <p className="text-text-muted text-sm">알고리즘 문제 추천 시스템</p>
        </div>

        {/* 카드 */}
        <div className="card">
          <h1 className="text-text-primary font-semibold text-lg mb-6">로그인</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-text-secondary text-xs font-mono mb-1.5 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                className="input-base"
                placeholder="user@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-text-secondary text-xs font-mono mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                className="input-base"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-accent-red text-sm bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">
                <span className="font-mono text-xs">ERR</span>
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="btn-primary mt-2" disabled={loading}>
              {loading ? (
                <span className="font-mono text-sm">connecting...</span>
              ) : (
                '로그인'
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-5 text-text-muted text-sm">
          계정이 없으신가요?{' '}
          <Link to="/register" className="text-accent-blue hover:text-blue-300 transition-colors">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  )
}