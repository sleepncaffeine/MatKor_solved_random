import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMe, getMyStats } from '../api/user'
import useAuthStore from '../store/auth'

const TIER_LABELS = [
  '', 'Bronze V', 'Bronze IV', 'Bronze III', 'Bronze II', 'Bronze I',
  'Silver V', 'Silver IV', 'Silver III', 'Silver II', 'Silver I',
  'Gold V', 'Gold IV', 'Gold III', 'Gold II', 'Gold I',
  'Platinum V', 'Platinum IV', 'Platinum III', 'Platinum II', 'Platinum I',
  'Diamond V', 'Diamond IV', 'Diamond III', 'Diamond II', 'Diamond I',
  'Ruby V', 'Ruby IV', 'Ruby III', 'Ruby II', 'Ruby I',
]

const TIER_COLORS = [
  '#9e9e9e',  // 0 unrated
  '#ad5600', '#ad5600', '#ad5600', '#ad5600', '#ad5600', // 1-5 bronze
  '#435f7a', '#435f7a', '#435f7a', '#435f7a', '#435f7a', // 6-10 silver
  '#ec9a00', '#ec9a00', '#ec9a00', '#ec9a00', '#ec9a00', // 11-15 gold
  '#27e2a4', '#27e2a4', '#27e2a4', '#27e2a4', '#27e2a4', // 16-20 platinum
  '#00b4fc', '#00b4fc', '#00b4fc', '#00b4fc', '#00b4fc', // 21-25 diamond
  '#ff0062', '#ff0062', '#ff0062', '#ff0062', '#ff0062', // 26-30 ruby
]

function TierBadge({ tier }) {
  const color = TIER_COLORS[tier] ?? '#9e9e9e'
  const label = TIER_LABELS[tier] ?? 'Unrated'
  return (
    <span className="font-mono font-semibold text-lg" style={{ color }}>
      {label}
    </span>
  )
}

function StatCard({ label, value, sub }) {
  return (
    <div className="card flex flex-col gap-1">
      <span className="text-text-muted text-xs font-mono uppercase tracking-wider">{label}</span>
      <span className="text-text-primary text-2xl font-semibold font-mono">{value}</span>
      {sub && <span className="text-text-muted text-xs">{sub}</span>}
    </div>
  )
}

function TagBar({ tag, maxRating }) {
  const pct = maxRating > 0 ? Math.min((tag.tag_rating / maxRating) * 100, 100) : 0
  // rating → tier 색상 (대략적 매핑)
  const getRatingColor = (r) => {
    if (r >= 2400) return '#ff0062'      // ruby
    if (r >= 1800) return '#00b4fc'      // diamond
    if (r >= 1200) return '#27e2a4'      // platinum
    if (r >= 600) return '#ec9a00'      // gold
    if (r >= 100) return '#435f7a'      // silver
    if (r >= 1) return '#ad5600'      // bronze
    return '#6b7280'
  }
  return (
    <div className="flex items-center gap-3">
      <span className="text-text-secondary text-sm font-mono w-36 truncate shrink-0">{tag.tag_name_ko}</span>
      <div className="flex-1 h-1.5 bg-bg-raised rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: getRatingColor(tag.tag_rating) }}
        />
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-text-muted text-xs font-mono w-8 text-right">{tag.solved_count}</span>
        <span className="text-xs font-mono w-12 text-right" style={{ color: getRatingColor(tag.tag_rating) }}>
          {tag.tag_rating > 0 ? tag.tag_rating : '—'}
        </span>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { setUser } = useAuthStore()
  const user = useAuthStore((s) => s.user)

  const [stats, setStats] = useState([])
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    getMe()
      .then((r) => setUser(r.data))
      .catch(() => navigate('/login'))
  }, [])

  useEffect(() => {
    if (!user) return
    getMyStats()
      .then((r) => {
        const sorted = [...r.data].sort((a, b) => b.solved_count - a.solved_count)
        setStats(sorted)
      })
      .finally(() => setLoadingStats(false))
  }, [user])

  if (!user) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <span className="font-mono text-text-muted text-sm animate-pulse">loading...</span>
      </div>
    )
  }

  const topTags = stats.slice(0, 10)

  return (
    <div className="min-h-screen bg-bg-base">
      {/* 배경 그리드 */}
      <div
        className="fixed inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#4f9cf9 1px, transparent 1px), linear-gradient(90deg, #4f9cf9 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* 헤더 */}
      <header className="border-b border-bg-border bg-bg-surface/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-accent-blue font-semibold">BOJ</span>
            <span className="text-bg-border">/</span>
            <span className="font-mono text-text-secondary">rec</span>
          </div>
          <nav className="flex items-center gap-6">
            <span className="text-text-primary text-sm border-b border-accent-blue pb-0.5">대시보드</span>
            <button
              onClick={() => navigate('/recommend')}
              className="text-text-secondary hover:text-text-primary text-sm transition-colors"
            >
              문제 추천
            </button>
            {user.role === 'admin' && (
              <button
                onClick={() => navigate('/admin/users')}
                className="text-accent-amber hover:text-amber-300 text-sm transition-colors font-mono"
              >
                admin
              </button>
            )}
            <button
              onClick={() => {
                localStorage.removeItem('access_token')
                localStorage.removeItem('refresh_token')
                navigate('/login')
              }}
              className="text-text-muted hover:text-accent-red text-sm transition-colors"
            >
              로그아웃
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8 animate-fade-in">
        {/* 프로필 */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-text-primary text-xl font-semibold">
                {user.boj_handle ?? user.email}
              </h1>
              {user.tier_override && (
                <span className="text-xs font-mono text-accent-amber border border-amber-700/40 bg-amber-950/20 px-1.5 py-0.5 rounded">
                  override
                </span>
              )}
            </div>
            <TierBadge tier={user.tier} />
          </div>

          {!user.boj_handle && (
            <button
              onClick={() => navigate('/onboarding')}
              className="text-sm border border-accent-blue text-accent-blue hover:bg-accent-blue hover:text-bg-base px-4 py-2 rounded-lg transition-all"
            >
              핸들 등록
            </button>
          )}
        </div>

        {/* 스탯 카드 */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Tier" value={TIER_LABELS[user.tier] ?? 'Unrated'} />
          <StatCard label="Rating" value={user.rating} />
          <StatCard label="태그 수" value={stats.length} sub="solved.ac 기준" />
        </div>

        {/* 태그 분포 */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-text-primary font-semibold">태그별 풀이 현황</h2>
            <span className="text-text-muted text-xs font-mono">상위 10개</span>
          </div>

          {loadingStats ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="h-3 bg-bg-raised rounded w-32" />
                  <div className="flex-1 h-1.5 bg-bg-raised rounded-full" />
                  <div className="h-3 bg-bg-raised rounded w-8" />
                </div>
              ))}
            </div>
          ) : topTags.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-text-muted text-sm">태그 데이터가 없습니다.</p>
              {!user.boj_handle && (
                <button
                  onClick={() => navigate('/onboarding')}
                  className="mt-3 text-accent-blue text-sm hover:underline"
                >
                  핸들을 등록하면 자동으로 불러옵니다
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {topTags.map((tag) => (
                <TagBar key={tag.tag_key} tag={tag} />
              ))}
            </div>
          )}
        </div>

        {/* 바로가기 */}
        <button
          onClick={() => navigate('/recommend')}
          className="w-full card border-dashed border-accent-blue/30 hover:border-accent-blue hover:bg-accent-blue/5 transition-all text-center py-8 group"
        >
          <p className="text-text-secondary group-hover:text-text-primary transition-colors font-mono text-sm">
            + 문제 추천받기
          </p>
        </button>
      </main>
    </div>
  )
}