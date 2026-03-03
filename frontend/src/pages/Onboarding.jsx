import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { registerHandle } from '../api/user'
import useAuthStore from '../store/auth'

export default function Onboarding() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)

  const [handle, setHandle] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const TIER_LABELS = [
    '', 'Bronze V', 'Bronze IV', 'Bronze III', 'Bronze II', 'Bronze I',
    'Silver V', 'Silver IV', 'Silver III', 'Silver II', 'Silver I',
    'Gold V', 'Gold IV', 'Gold III', 'Gold II', 'Gold I',
    'Platinum V', 'Platinum IV', 'Platinum III', 'Platinum II', 'Platinum I',
    'Diamond V', 'Diamond IV', 'Diamond III', 'Diamond II', 'Diamond I',
    'Ruby V', 'Ruby IV', 'Ruby III', 'Ruby II', 'Ruby I',
  ]

  const TIER_COLORS = {
    0: '#9e9e9e', 1: '#ad5600', 6: '#435f7a', 11: '#ec9a00',
    16: '#27e2a4', 21: '#00b4fc', 26: '#ff0062',
  }

  const getTierColor = (tier) => {
    const base = Math.floor((tier - 1) / 5) * 5 + 1
    return TIER_COLORS[base] ?? '#9e9e9e'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await registerHandle(handle.trim())
      setResult(data)
    } catch (err) {
      setError(err.response?.data?.detail ?? '핸들을 찾을 수 없습니다.')
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
          <p className="text-text-muted text-sm">BOJ 핸들을 연결하세요</p>
        </div>

        <div className="card">
          <div className="mb-6">
            <h1 className="text-text-primary font-semibold text-lg">핸들 등록</h1>
            <p className="text-text-muted text-sm mt-1">
              solved.ac에 등록된 BOJ 아이디를 입력하세요.
            </p>
          </div>

          {!result ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-text-secondary text-xs font-mono mb-1.5 uppercase tracking-wider">
                  BOJ Handle
                </label>
                <input
                  type="text"
                  className="input-base"
                  placeholder="예: tourist"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  required
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-accent-red text-sm bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">
                  <span className="font-mono text-xs">ERR</span>
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? <span className="font-mono text-sm">fetching from solved.ac...</span> : '핸들 연결'}
              </button>
            </form>
          ) : (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-bg-raised border border-bg-border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary text-sm">핸들</span>
                  <span className="font-mono text-text-primary">{result.boj_handle}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary text-sm">티어</span>
                  <span className="font-mono font-semibold" style={{ color: getTierColor(result.tier) }}>
                    {TIER_LABELS[result.tier] ?? 'Unrated'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary text-sm">레이팅</span>
                  <span className="font-mono text-accent-blue">{result.rating}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary text-sm">태그 통계</span>
                  <span className="font-mono text-text-secondary">{result.tag_stats_count}개 로드됨</span>
                </div>
              </div>

              <button
                className="btn-primary"
                onClick={() => navigate('/dashboard')}
              >
                대시보드로 이동
              </button>
            </div>
          )}
        </div>

        <p className="text-center mt-5">
          <button
            className="btn-ghost"
            onClick={() => navigate('/dashboard')}
          >
            나중에 등록하기
          </button>
        </p>
      </div>
    </div>
  )
}