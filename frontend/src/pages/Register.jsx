import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../api/auth'
import { getMe } from '../api/user'
import useAuthStore from '../store/auth'

export default function Register() {
  const navigate = useNavigate()
  const loginStore = useAuthStore((s) => s.login)

  const [form, setForm] = useState({ email: '', password: '', confirm: '', signup_key: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }
    if (form.password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.')
      return
    }
    if (form.signup_key.length !== 4) {
      setError('회원가입 키는 4자리 숫자입니다.')
      return
    }

    setLoading(true)
    try {
      const { data: tokens } = await register(form.email, form.password, form.signup_key)
      localStorage.setItem('access_token', tokens.access_token)
      localStorage.setItem('refresh_token', tokens.refresh_token)
      const { data: user } = await getMe()
      loginStore(tokens, user)
      navigate('/onboarding')
    } catch (err) {
      setError(err.response?.data?.detail ?? '회원가입에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#4f9cf9 1px, transparent 1px), linear-gradient(90deg, #4f9cf9 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="font-mono text-accent-blue text-2xl font-semibold">BOJ</span>
            <span className="text-bg-border text-2xl">/</span>
            <span className="font-mono text-text-secondary text-2xl">rec</span>
          </div>
          <p className="text-text-muted text-sm">알고리즘 문제 추천 시스템</p>
        </div>

        <div className="card">
          <h1 className="text-text-primary font-semibold text-lg mb-6">회원가입</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-text-secondary text-xs font-mono mb-1.5 uppercase tracking-wider">Email</label>
              <input type="email" className="input-base" placeholder="user@example.com"
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label className="block text-text-secondary text-xs font-mono mb-1.5 uppercase tracking-wider">Password</label>
              <input type="password" className="input-base" placeholder="8자 이상"
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>
            <div>
              <label className="block text-text-secondary text-xs font-mono mb-1.5 uppercase tracking-wider">Confirm Password</label>
              <input type="password" className="input-base" placeholder="비밀번호 재입력"
                value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required />
            </div>
            <div>
              <label className="block text-text-secondary text-xs font-mono mb-1.5 uppercase tracking-wider">회원가입 키</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                className="input-base tracking-[0.5em] text-center font-mono"
                placeholder="0000"
                value={form.signup_key}
                onChange={(e) => setForm({ ...form, signup_key: e.target.value.replace(/\D/g, '') })}
                required
              />
              <p className="text-text-muted text-xs mt-1">관리자에게 문의하여 키를 받으세요.</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-accent-red text-sm bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">
                <span className="font-mono text-xs">ERR</span>
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="btn-primary mt-2" disabled={loading}>
              {loading ? <span className="font-mono text-sm">creating account...</span> : '계정 만들기'}
            </button>
          </form>
        </div>

        <p className="text-center mt-5 text-text-muted text-sm">
          이미 계정이 있으신가요?{' '}
          <Link to="/login" className="text-accent-blue hover:text-blue-300 transition-colors">
            로그인
          </Link>
        </p>
      </div>
    </div>
  )
}