import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Nav from '../components/layout/Nav'
import { getMe, getMyStats } from '../api/user'
import useAuthStore from '../store/auth'

// solved.ac 공식 rating → tier 변환표 (이미지 기준)
// tier 숫자: 1=Bronze V ... 30=Ruby I, 31=Master
const RATING_BREAKPOINTS = [
  { min: 3000, tier: 31, label: 'Master', color: '#b491ff' },
  { min: 2950, tier: 30, label: 'Ruby I', color: '#ff0062' },
  { min: 2900, tier: 29, label: 'Ruby II', color: '#ff0062' },
  { min: 2850, tier: 28, label: 'Ruby III', color: '#ff0062' },
  { min: 2800, tier: 27, label: 'Ruby IV', color: '#ff0062' },
  { min: 2700, tier: 26, label: 'Ruby V', color: '#ff0062' },
  { min: 2600, tier: 25, label: 'Diamond I', color: '#00b4fc' },
  { min: 2500, tier: 24, label: 'Diamond II', color: '#00b4fc' },
  { min: 2400, tier: 23, label: 'Diamond III', color: '#00b4fc' },
  { min: 2300, tier: 22, label: 'Diamond IV', color: '#00b4fc' },
  { min: 2200, tier: 21, label: 'Diamond V', color: '#00b4fc' },
  { min: 2100, tier: 20, label: 'Platinum I', color: '#27e2a4' },
  { min: 2000, tier: 19, label: 'Platinum II', color: '#27e2a4' },
  { min: 1900, tier: 18, label: 'Platinum III', color: '#27e2a4' },
  { min: 1750, tier: 17, label: 'Platinum IV', color: '#27e2a4' },
  { min: 1600, tier: 16, label: 'Platinum V', color: '#27e2a4' },
  { min: 1400, tier: 15, label: 'Gold I', color: '#ec9a00' },
  { min: 1250, tier: 14, label: 'Gold II', color: '#ec9a00' },
  { min: 1100, tier: 13, label: 'Gold III', color: '#ec9a00' },
  { min: 950, tier: 12, label: 'Gold IV', color: '#ec9a00' },
  { min: 800, tier: 11, label: 'Gold V', color: '#ec9a00' },
  { min: 650, tier: 10, label: 'Silver I', color: '#435f7a' },
  { min: 500, tier: 9, label: 'Silver II', color: '#435f7a' },
  { min: 400, tier: 8, label: 'Silver III', color: '#435f7a' },
  { min: 300, tier: 7, label: 'Silver IV', color: '#435f7a' },
  { min: 200, tier: 6, label: 'Silver V', color: '#435f7a' },
  { min: 150, tier: 5, label: 'Bronze I', color: '#ad5600' },
  { min: 120, tier: 4, label: 'Bronze II', color: '#ad5600' },
  { min: 90, tier: 3, label: 'Bronze III', color: '#ad5600' },
  { min: 60, tier: 2, label: 'Bronze IV', color: '#ad5600' },
  { min: 30, tier: 1, label: 'Bronze V', color: '#ad5600' },
  { min: 0, tier: 0, label: 'Unrated', color: '#6b7280' },
]

// solved.ac user/show tier 숫자(0~30) → label/color
const TIER_TABLE = [
  { label: 'Unrated', color: '#6b7280' },
  { label: 'Bronze V', color: '#ad5600' },
  { label: 'Bronze IV', color: '#ad5600' },
  { label: 'Bronze III', color: '#ad5600' },
  { label: 'Bronze II', color: '#ad5600' },
  { label: 'Bronze I', color: '#ad5600' },
  { label: 'Silver V', color: '#435f7a' },
  { label: 'Silver IV', color: '#435f7a' },
  { label: 'Silver III', color: '#435f7a' },
  { label: 'Silver II', color: '#435f7a' },
  { label: 'Silver I', color: '#435f7a' },
  { label: 'Gold V', color: '#ec9a00' },
  { label: 'Gold IV', color: '#ec9a00' },
  { label: 'Gold III', color: '#ec9a00' },
  { label: 'Gold II', color: '#ec9a00' },
  { label: 'Gold I', color: '#ec9a00' },
  { label: 'Platinum V', color: '#27e2a4' },
  { label: 'Platinum IV', color: '#27e2a4' },
  { label: 'Platinum III', color: '#27e2a4' },
  { label: 'Platinum II', color: '#27e2a4' },
  { label: 'Platinum I', color: '#27e2a4' },
  { label: 'Diamond V', color: '#00b4fc' },
  { label: 'Diamond IV', color: '#00b4fc' },
  { label: 'Diamond III', color: '#00b4fc' },
  { label: 'Diamond II', color: '#00b4fc' },
  { label: 'Diamond I', color: '#00b4fc' },
  { label: 'Ruby V', color: '#ff0062' },
  { label: 'Ruby IV', color: '#ff0062' },
  { label: 'Ruby III', color: '#ff0062' },
  { label: 'Ruby II', color: '#ff0062' },
  { label: 'Ruby I', color: '#ff0062' },
]

function getTierInfo(tier) {
  return TIER_TABLE[tier] ?? { label: 'Unrated', color: '#6b7280' }
}

function getRatingTierInfo(rating) {
  for (const bp of RATING_BREAKPOINTS) {
    if (rating >= bp.min) return bp
  }
  return { label: 'Unrated', color: '#6b7280', tier: 0 }
}

function TierBadge({ tier }) {
  const { label, color } = getTierInfo(tier)
  return (
    <span className="font-mono font-semibold text-lg" style={{ color }}>
      {label}
    </span>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div className="card flex flex-col gap-1">
      <span className="text-text-muted text-xs font-mono uppercase tracking-wider">{label}</span>
      <span className="text-2xl font-semibold font-mono" style={{ color: color || undefined }}>
        {value}
      </span>
    </div>
  )
}

function TagBar({ tag, maxRating }) {
  const pct = maxRating > 0 ? Math.min((tag.tag_rating / maxRating) * 100, 100) : 0
  const { label, color } = getRatingTierInfo(tag.tag_rating)

  return (
    <div className="flex items-center gap-3">
      <span className="text-text-secondary text-sm font-mono w-36 truncate shrink-0">
        {tag.tag_name_ko}
      </span>
      <div className="flex-1 h-1.5 bg-bg-raised rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex items-center gap-3 shrink-0 w-40 justify-end">
        <span className="text-text-muted text-xs font-mono">{tag.solved_count}문제</span>
        {tag.tag_rating > 0 ? (
          <span className="text-xs font-mono font-semibold w-24 text-right" style={{ color }}>
            {label} ({tag.tag_rating})
          </span>
        ) : (
          <span className="text-text-muted text-xs font-mono w-24 text-right">—</span>
        )}
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
        const sorted = [...r.data].sort((a, b) => b.tag_rating - a.tag_rating)
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
  const maxRating = topTags.length > 0 ? Math.max(...topTags.map((t) => t.tag_rating)) : 1
  const { color: tierColor } = getTierInfo(user.tier)

  return (
    <div className="min-h-screen bg-bg-base">
      <div
        className="fixed inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#4f9cf9 1px, transparent 1px), linear-gradient(90deg, #4f9cf9 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <Nav />

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
          <StatCard label="Tier" value={getTierInfo(user.tier).label} color={tierColor} />
          <StatCard label="Rating" value={user.rating} color={tierColor} />
          <StatCard label="태그 수" value={stats.length} />
        </div>

        {/* 태그 분포 */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-text-primary font-semibold">태그별 레이팅</h2>
            <span className="text-text-muted text-xs font-mono">레이팅 높은 순 상위 10개</span>
          </div>

          {loadingStats ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="h-3 bg-bg-raised rounded w-32" />
                  <div className="flex-1 h-1.5 bg-bg-raised rounded-full" />
                  <div className="h-3 bg-bg-raised rounded w-24" />
                </div>
              ))}
            </div>
          ) : topTags.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-text-muted text-sm">태그 데이터가 없습니다.</p>
              {!user.boj_handle && (
                <button onClick={() => navigate('/onboarding')} className="mt-3 text-accent-blue text-sm hover:underline">
                  핸들을 등록하면 자동으로 불러옵니다
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {topTags.map((tag) => (
                <TagBar key={tag.tag_key} tag={tag} maxRating={maxRating} />
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