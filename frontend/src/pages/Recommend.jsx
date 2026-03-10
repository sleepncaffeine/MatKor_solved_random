import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Nav from '../components/layout/Nav'
import { recommend as apiRecommend } from '../api/recommend'
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
  '#9e9e9e',
  '#ad5600', '#ad5600', '#ad5600', '#ad5600', '#ad5600',
  '#435f7a', '#435f7a', '#435f7a', '#435f7a', '#435f7a',
  '#ec9a00', '#ec9a00', '#ec9a00', '#ec9a00', '#ec9a00',
  '#27e2a4', '#27e2a4', '#27e2a4', '#27e2a4', '#27e2a4',
  '#00b4fc', '#00b4fc', '#00b4fc', '#00b4fc', '#00b4fc',
  '#ff0062', '#ff0062', '#ff0062', '#ff0062', '#ff0062',
]

// solved.ac 주요 태그 목록
const COMMON_TAGS = [
  { key: 'dp', label: '다이나믹 프로그래밍' },
  { key: 'graphs', label: '그래프 이론' },
  { key: 'graph_traversal', label: '그래프 탐색' },
  { key: 'greedy', label: '그리디 알고리즘' },
  { key: 'implementation', label: '구현' },
  { key: 'math', label: '수학' },
  { key: 'data_structures', label: '자료구조' },
  { key: 'string', label: '문자열' },
  { key: 'bfs', label: '너비 우선 탐색' },
  { key: 'dfs', label: '깊이 우선 탐색' },
  { key: 'binary_search', label: '이분 탐색' },
  { key: 'sorting', label: '정렬' },
  { key: 'tree', label: '트리' },
  { key: 'number_theory', label: '정수론' },
  { key: 'geometry', label: '기하학' },
  { key: 'two_pointer', label: '두 포인터' },
  { key: 'prefix_sum', label: '누적 합' },
  { key: 'backtracking', label: '백트래킹' },
  { key: 'shortest_path', label: '최단 경로' },
  { key: 'segment_tree', label: '세그먼트 트리' },
  { key: 'divide_and_conquer', label: '분할 정복' },
  { key: 'combinatorics', label: '조합론' },
  { key: 'simulation', label: '시뮬레이션' },
  { key: 'hash_map', label: '해시를 사용한 집합과 맵' },
]

const MODES = [
  { key: 'practice', label: '연습', desc: '살짝 낮은 난이도', color: 'text-accent-green' },
  { key: 'train', label: '훈련', desc: '현재 티어 수준', color: 'text-accent-blue' },
  { key: 'challenge', label: '도전', desc: '살짝 높은 난이도', color: 'text-accent-amber' },
]

function ProblemCard({ problem, index }) {
  const color = TIER_COLORS[problem.level] ?? '#9e9e9e'
  const tierLabel = TIER_LABELS[problem.level] ?? 'Unrated'

  return (
    <a
      href={problem.url}
      target="_blank"
      rel="noopener noreferrer"
      className="card hover:border-bg-border/80 hover:bg-bg-raised/50 transition-all group block"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-text-muted text-xs">#{problem.problem_id}</span>
            <span className="font-mono text-xs font-semibold" style={{ color }}>
              {tierLabel}
            </span>
          </div>
          <p className="text-text-primary font-medium group-hover:text-accent-blue transition-colors truncate">
            {problem.title}
          </p>
          <div className="flex flex-wrap gap-1 mt-2">
            {problem.tags.slice(0, 4).map((t) => (
              <span key={t} className="tag-badge">{t}</span>
            ))}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-text-muted text-xs font-mono">{problem.solved_count.toLocaleString()}명</p>
          <p className="text-text-muted text-xs">해결</p>
        </div>
      </div>
    </a>
  )
}

export default function Recommend() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const [selectedTags, setSelectedTags] = useState([])
  const [tagLogic, setTagLogic] = useState('AND')
  const [mode, setMode] = useState('train')
  const [count, setCount] = useState(10)
  const [tagSearch, setTagSearch] = useState('')

  const [problems, setProblems] = useState([])
  const [queryUsed, setQueryUsed] = useState('')
  const [effectiveTier, setEffectiveTier] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)

  const toggleTag = (key) => {
    setSelectedTags((prev) =>
      prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (selectedTags.length === 0) {
      setError('태그를 하나 이상 선택하세요.')
      return
    }
    setError('')
    setLoading(true)
    setSearched(false)

    try {
      const { data } = await apiRecommend(selectedTags, tagLogic, mode, count)
      setProblems(data.problems)
      setQueryUsed(data.query_used)
      setEffectiveTier(data.effective_tier ?? 0)
      setSearched(true)
    } catch (err) {
      setError(err.response?.data?.detail ?? '추천 요청에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const filteredTags = COMMON_TAGS.filter(
    (t) =>
      t.label.toLowerCase().includes(tagSearch.toLowerCase()) ||
      t.key.toLowerCase().includes(tagSearch.toLowerCase())
  )

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

      <main className="max-w-5xl mx-auto px-6 py-10 animate-fade-in">
        <div className="grid grid-cols-[340px_1fr] gap-8 items-start">

          {/* 왼쪽 패널 — 설정 */}
          <form onSubmit={handleSubmit} className="space-y-5 sticky top-24">

            {/* 태그 선택 */}
            <div className="card space-y-3">
              <h2 className="text-text-primary font-semibold text-sm">태그 선택</h2>

              <input
                type="text"
                className="input-base text-xs py-2"
                placeholder="태그 검색..."
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
              />

              <div className="flex flex-wrap gap-1.5 max-h-52 overflow-y-auto pr-1">
                {filteredTags.map((tag) => {
                  const active = selectedTags.includes(tag.key)
                  return (
                    <button
                      key={tag.key}
                      type="button"
                      onClick={() => toggleTag(tag.key)}
                      className={[
                        'px-2 py-1 rounded-md text-xs font-mono border transition-all',
                        active
                          ? 'bg-accent-blue/20 border-accent-blue text-accent-blue'
                          : 'bg-bg-raised border-bg-border text-text-secondary hover:border-text-muted',
                      ].join(' ')}
                    >
                      {tag.label}
                    </button>
                  )
                })}
              </div>

              {selectedTags.length > 0 && (
                <div className="flex items-center justify-between pt-1 border-t border-bg-border">
                  <span className="text-text-muted text-xs font-mono">
                    {selectedTags.length}개 선택됨
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedTags([])}
                    className="text-text-muted hover:text-accent-red text-xs transition-colors"
                  >
                    초기화
                  </button>
                </div>
              )}
            </div>

            {/* AND / OR */}
            <div className="card space-y-3">
              <h2 className="text-text-primary font-semibold text-sm">태그 조건</h2>
              <div className="grid grid-cols-2 gap-2">
                {['AND', 'OR'].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setTagLogic(v)}
                    className={[
                      'py-2 rounded-lg text-sm font-mono border transition-all',
                      tagLogic === v
                        ? 'bg-accent-blue/20 border-accent-blue text-accent-blue'
                        : 'border-bg-border text-text-secondary hover:border-text-muted',
                    ].join(' ')}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <p className="text-text-muted text-xs">
                {tagLogic === 'AND' ? '선택한 태그를 모두 포함한 문제' : '선택한 태그 중 하나 이상 포함한 문제'}
              </p>
            </div>

            {/* 모드 */}
            <div className="card space-y-3">
              <h2 className="text-text-primary font-semibold text-sm">난이도 모드</h2>
              <div className="space-y-2">
                {MODES.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setMode(m.key)}
                    className={[
                      'w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all text-left',
                      mode === m.key
                        ? 'bg-bg-raised border-accent-blue'
                        : 'border-bg-border hover:border-text-muted',
                    ].join(' ')}
                  >
                    <span className={`font-mono text-sm font-medium ${mode === m.key ? m.color : 'text-text-secondary'}`}>
                      {m.label}
                    </span>
                    <span className="text-text-muted text-xs">{m.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 개수 */}
            <div className="card space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-text-primary font-semibold text-sm">추천 개수</h2>
                <span className="font-mono text-accent-blue text-sm">{count}</span>
              </div>
              <input
                type="range"
                min={5} max={50} step={5}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full accent-accent-blue"
              />
              <div className="flex justify-between text-text-muted text-xs font-mono">
                <span>5</span><span>50</span>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-accent-red text-sm bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">
                <span className="font-mono text-xs">ERR</span>
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading
                ? <span className="font-mono text-sm">fetching problems...</span>
                : '문제 추천받기'}
            </button>
          </form>

          {/* 오른쪽 패널 — 결과 */}
          <div className="space-y-4">
            {!searched && !loading && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <p className="text-text-muted font-mono text-sm">태그와 모드를 선택하고</p>
                <p className="text-text-muted font-mono text-sm">문제를 추천받으세요.</p>
              </div>
            )}

            {loading && (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="card animate-pulse">
                    <div className="h-4 bg-bg-raised rounded w-1/3 mb-2" />
                    <div className="h-5 bg-bg-raised rounded w-2/3" />
                  </div>
                ))}
              </div>
            )}

            {searched && !loading && (
              <>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-text-primary font-semibold">
                    추천 결과 <span className="text-text-muted font-normal text-sm">({problems.length}문제)</span>
                  </h2>
                  <div className="flex items-center gap-2">
                    {effectiveTier > 0 && (
                      <span className="text-xs font-mono text-accent-green bg-green-950/30 border border-green-800/40 px-2 py-1 rounded">
                        태그 기준 tier:{effectiveTier}
                      </span>
                    )}
                    <code className="text-text-muted text-xs font-mono bg-bg-raised px-2 py-1 rounded truncate max-w-xs">
                      {queryUsed}
                    </code>
                  </div>
                </div>

                {problems.length === 0 ? (
                  <div className="card text-center py-12">
                    <p className="text-text-muted text-sm">조건에 맞는 문제가 없습니다.</p>
                    <p className="text-text-muted text-xs mt-1">태그 조건을 OR로 바꾸거나 다른 모드를 시도해보세요.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {problems.map((p, i) => (
                      <ProblemCard key={p.problem_id} problem={p} index={i} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}