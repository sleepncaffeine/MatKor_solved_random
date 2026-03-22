import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Nav from '../../components/layout/Nav'
import client from '../../api/client'

const TIER_TABLE = [
    { label: 'Unrated', color: '#6b7280' },
    { label: 'B5', color: '#ad5600' }, { label: 'B4', color: '#ad5600' },
    { label: 'B3', color: '#ad5600' }, { label: 'B2', color: '#ad5600' },
    { label: 'B1', color: '#ad5600' },
    { label: 'S5', color: '#435f7a' }, { label: 'S4', color: '#435f7a' },
    { label: 'S3', color: '#435f7a' }, { label: 'S2', color: '#435f7a' },
    { label: 'S1', color: '#435f7a' },
    { label: 'G5', color: '#ec9a00' }, { label: 'G4', color: '#ec9a00' },
    { label: 'G3', color: '#ec9a00' }, { label: 'G2', color: '#ec9a00' },
    { label: 'G1', color: '#ec9a00' },
    { label: 'P5', color: '#27e2a4' }, { label: 'P4', color: '#27e2a4' },
    { label: 'P3', color: '#27e2a4' }, { label: 'P2', color: '#27e2a4' },
    { label: 'P1', color: '#27e2a4' },
    { label: 'D5', color: '#00b4fc' }, { label: 'D4', color: '#00b4fc' },
    { label: 'D3', color: '#00b4fc' }, { label: 'D2', color: '#00b4fc' },
    { label: 'D1', color: '#00b4fc' },
    { label: 'R5', color: '#ff0062' }, { label: 'R4', color: '#ff0062' },
    { label: 'R3', color: '#ff0062' }, { label: 'R2', color: '#ff0062' },
    { label: 'R1', color: '#ff0062' },
]

// 티어 점수 (리더보드 정렬용): 높을수록 좋음
const tierScore = (level) => level ?? 0

function computeRanking(participants, visibleEvents) {
    const solvedSet = new Set(visibleEvents.map(e => `${e.user_id}:${e.problem_id}`))
    return participants
        .map(p => {
            const solved = p.problems.filter(pr =>
                pr.first_solved_at && solvedSet.has(`${p.user_id}:${pr.problem_id}`)
            )
            const score = solved.reduce((acc, pr) => acc + tierScore(pr.level), 0)
            const lastSolvedAt = solved.length > 0
                ? solved.map(pr => pr.first_solved_at).sort().at(-1)
                : null
            return { ...p, solvedProblems: solved, score, lastSolvedAt }
        })
        .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score
            if (a.lastSolvedAt && b.lastSolvedAt) return a.lastSolvedAt.localeCompare(b.lastSolvedAt)
            return 0
        })
}

function EventLog({ events, currentIdx }) {
    const ref = useRef(null)
    useEffect(() => {
        if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
    }, [currentIdx])

    return (
        <div ref={ref} className="h-48 overflow-y-auto space-y-1 pr-1">
            {events.slice(0, currentIdx + 1).map((e, i) => {
                const tier = TIER_TABLE[e.level] ?? TIER_TABLE[0]
                const time = new Date(e.solved_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                return (
                    <div key={i} className={`flex items-center gap-2 text-xs font-mono px-2 py-1 rounded transition-all ${i === currentIdx ? 'bg-accent-blue/10 border border-accent-blue/20' : 'text-text-muted'}`}>
                        <span className="text-text-muted w-16 shrink-0">{time}</span>
                        <span className="font-semibold text-accent-blue shrink-0">{e.boj_handle}</span>
                        <span style={{ color: tier.color }} className="shrink-0">[{tier.label}]</span>
                        <span className="truncate text-text-secondary">#{e.problem_id} {e.title}</span>
                        {e.solved_after_end && <span className="text-text-muted border border-bg-border px-1 rounded shrink-0">종료후</span>}
                    </div>
                )
            })}
        </div>
    )
}

function RankingBoard({ ranking }) {
    return (
        <div className="space-y-2">
            {ranking.map((p, idx) => {
                const pct = p.total > 0 ? (p.solvedProblems.length / p.total) * 100 : 0
                return (
                    <div key={p.user_id} className="flex items-center gap-3">
                        <span className="text-text-muted font-mono text-sm w-5 shrink-0 text-right">{idx + 1}</span>
                        <span className="text-accent-blue font-mono text-sm w-28 truncate shrink-0">{p.boj_handle}</span>
                        <div className="flex-1 relative h-6 bg-bg-raised rounded overflow-hidden">
                            <div
                                className="h-full rounded transition-all duration-700"
                                style={{ width: `${pct}%`, backgroundColor: '#4f9cf9' }}
                            />
                            <div className="absolute inset-0 flex items-center px-2 gap-1">
                                {p.solvedProblems.map(pr => {
                                    const tier = TIER_TABLE[pr.level] ?? TIER_TABLE[0]
                                    return (
                                        <span
                                            key={pr.problem_id}
                                            title={`#${pr.problem_id} ${pr.title}`}
                                            className="text-xs font-mono font-bold"
                                            style={{ color: tier.color }}
                                        >
                                            {tier.label}
                                        </span>
                                    )
                                })}
                            </div>
                        </div>
                        <span className="font-mono text-sm text-text-secondary shrink-0 w-12 text-right">
                            {p.solvedProblems.length}/{p.total}
                        </span>
                        <span className="font-mono text-xs text-text-muted shrink-0 w-14 text-right">
                            +{p.score}pt
                        </span>
                    </div>
                )
            })}
        </div>
    )
}

export default function Scoreboard() {
    const { defenseId } = useParams()
    const navigate = useNavigate()

    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    // 재생 상태
    const [currentIdx, setCurrentIdx] = useState(-1)  // -1 = 재생 전
    const [playing, setPlaying] = useState(false)
    const [speed, setSpeed] = useState(1500)  // ms per event
    const intervalRef = useRef(null)

    useEffect(() => {
        client.get(`/admin/defense/${defenseId}/scoreboard`)
            .then(r => setData(r.data))
            .catch(() => setError('스코어보드를 불러올 수 없습니다.'))
            .finally(() => setLoading(false))
    }, [defenseId])

    // 재생 인터벌
    useEffect(() => {
        if (playing && data) {
            intervalRef.current = setInterval(() => {
                setCurrentIdx(prev => {
                    const next = prev + 1
                    if (next >= data.events.length) {
                        setPlaying(false)
                        return prev
                    }
                    return next
                })
            }, speed)
        }
        return () => clearInterval(intervalRef.current)
    }, [playing, speed, data])

    if (loading) return (
        <div className="min-h-screen bg-bg-base">
            <Nav />
            <div className="flex items-center justify-center h-64">
                <span className="text-text-muted font-mono animate-pulse">loading scoreboard...</span>
            </div>
        </div>
    )

    if (error || !data) return (
        <div className="min-h-screen bg-bg-base">
            <Nav />
            <div className="flex items-center justify-center h-64">
                <span className="text-accent-red font-mono">{error || '데이터 없음'}</span>
            </div>
        </div>
    )

    const events = data.events
    const visibleEvents = currentIdx >= 0 ? events.slice(0, currentIdx + 1) : []
    const ranking = computeRanking(data.participants, visibleEvents)
    const totalEvents = events.length

    const handlePlay = () => {
        if (currentIdx >= totalEvents - 1) {
            setCurrentIdx(-1)
            setTimeout(() => setPlaying(true), 50)
        } else {
            setPlaying(true)
        }
    }

    const handleReset = () => {
        setPlaying(false)
        clearInterval(intervalRef.current)
        setCurrentIdx(-1)
    }

    const fmt = d => new Date(d).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

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

            <main className="max-w-4xl mx-auto px-6 py-10 animate-fade-in space-y-6">
                {/* 헤더 */}
                <div>
                    <button onClick={() => navigate('/admin/defense')} className="text-text-muted text-xs font-mono hover:text-text-secondary mb-3 block">
                        ← 디펜스 관리로
                    </button>
                    <h1 className="text-xl font-semibold text-text-primary">{data.title}</h1>
                    <p className="text-text-muted text-xs font-mono mt-1">{fmt(data.start_at)} ~ {fmt(data.end_at)}</p>
                </div>

                {/* 재생 컨트롤 */}
                <div className="card flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={playing ? () => setPlaying(false) : handlePlay}
                            className="px-4 py-2 text-sm font-mono border border-accent-blue/50 text-accent-blue hover:bg-accent-blue/10 rounded-lg transition-colors"
                        >
                            {playing ? '⏸ 일시정지' : currentIdx >= totalEvents - 1 ? '↺ 다시보기' : currentIdx === -1 ? '▶ 재생' : '▶ 계속'}
                        </button>
                        <button
                            onClick={handleReset}
                            className="px-3 py-2 text-sm font-mono border border-bg-border text-text-muted hover:border-text-muted rounded-lg transition-colors"
                        >
                            ↺ 초기화
                        </button>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono text-text-muted">
                        <span>속도</span>
                        {[2500, 1500, 800, 300].map(s => (
                            <button
                                key={s}
                                onClick={() => setSpeed(s)}
                                className={`px-2 py-1 rounded border transition-colors ${speed === s ? 'border-accent-blue text-accent-blue' : 'border-bg-border hover:border-text-muted'}`}
                            >
                                {s === 2500 ? '0.5x' : s === 1500 ? '1x' : s === 800 ? '2x' : '5x'}
                            </button>
                        ))}
                    </div>

                    <span className="text-text-muted text-xs font-mono ml-auto">
                        {currentIdx + 1} / {totalEvents} 이벤트
                    </span>
                </div>

                {/* 진행 슬라이더 */}
                <div className="px-1">
                    <input
                        type="range"
                        min={-1}
                        max={totalEvents - 1}
                        value={currentIdx}
                        onChange={e => { setPlaying(false); setCurrentIdx(parseInt(e.target.value)) }}
                        className="w-full accent-accent-blue"
                    />
                </div>

                {/* 이벤트 로그 */}
                <div className="card space-y-2">
                    <p className="text-text-muted text-xs font-mono uppercase tracking-wider">이벤트 로그</p>
                    {events.length === 0
                        ? <p className="text-text-muted text-sm text-center py-6">갱신된 풀이 데이터가 없습니다.</p>
                        : <EventLog events={events} currentIdx={currentIdx} />
                    }
                </div>

                {/* 리더보드 */}
                <div className="card space-y-4">
                    <p className="text-text-muted text-xs font-mono uppercase tracking-wider">리더보드</p>
                    {ranking.length === 0
                        ? <p className="text-text-muted text-sm text-center py-6">참가자 없음</p>
                        : <RankingBoard ranking={ranking} />
                    }
                </div>

                {/* 점수 기준 안내 */}
                <p className="text-text-muted text-xs font-mono text-center">
                    점수 = 풀이한 문제들의 티어 합산 (B1=5, S1=10, G1=15, P1=20, D1=25, R1=30) · 동점 시 마지막 풀이 시각 빠른 순
                </p>
            </main>
        </div>
    )
}