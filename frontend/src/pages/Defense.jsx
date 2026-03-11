import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Nav from '../components/layout/Nav'
import useAuthStore from '../store/auth'
import { getMe } from '../api/user'
import {
    getActiveDefenses, getMyAssignments,
    joinDefense, refreshDefense, syncDefense, updateDefenseMode
} from '../api/defense'

const TIER_TABLE = [
    { label: 'Unrated', color: '#6b7280' },
    { label: 'Bronze V', color: '#ad5600' }, { label: 'Bronze IV', color: '#ad5600' },
    { label: 'Bronze III', color: '#ad5600' }, { label: 'Bronze II', color: '#ad5600' },
    { label: 'Bronze I', color: '#ad5600' },
    { label: 'Silver V', color: '#435f7a' }, { label: 'Silver IV', color: '#435f7a' },
    { label: 'Silver III', color: '#435f7a' }, { label: 'Silver II', color: '#435f7a' },
    { label: 'Silver I', color: '#435f7a' },
    { label: 'Gold V', color: '#ec9a00' }, { label: 'Gold IV', color: '#ec9a00' },
    { label: 'Gold III', color: '#ec9a00' }, { label: 'Gold II', color: '#ec9a00' },
    { label: 'Gold I', color: '#ec9a00' },
    { label: 'Platinum V', color: '#27e2a4' }, { label: 'Platinum IV', color: '#27e2a4' },
    { label: 'Platinum III', color: '#27e2a4' }, { label: 'Platinum II', color: '#27e2a4' },
    { label: 'Platinum I', color: '#27e2a4' },
    { label: 'Diamond V', color: '#00b4fc' }, { label: 'Diamond IV', color: '#00b4fc' },
    { label: 'Diamond III', color: '#00b4fc' }, { label: 'Diamond II', color: '#00b4fc' },
    { label: 'Diamond I', color: '#00b4fc' },
    { label: 'Ruby V', color: '#ff0062' }, { label: 'Ruby IV', color: '#ff0062' },
    { label: 'Ruby III', color: '#ff0062' }, { label: 'Ruby II', color: '#ff0062' },
    { label: 'Ruby I', color: '#ff0062' },
]

const MODES = [
    { key: 'practice', label: '연습', desc: '살짝 낮은 난이도', color: 'text-accent-green' },
    { key: 'train', label: '훈련', desc: '현재 티어 수준', color: 'text-accent-blue' },
    { key: 'challenge', label: '도전', desc: '살짝 높은 난이도', color: 'text-accent-amber' },
]

function formatRemaining(endAt) {
    const diff = new Date(endAt) - new Date()
    if (diff <= 0) return '종료됨'
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    if (h >= 24) return `${Math.floor(h / 24)}일 ${h % 24}시간`
    return `${h}시간 ${m}분`
}

function formatDate(d) {
    return new Date(d).toLocaleDateString('ko-KR', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })
}

function ProblemRow({ p }) {
    const tier = TIER_TABLE[p.level] ?? TIER_TABLE[0]
    return (
        <div className={[
            'flex items-center justify-between px-4 py-3 rounded-lg border transition-all',
            p.solved
                ? 'border-accent-green/40 bg-green-950/20'
                : 'border-bg-border bg-bg-raised',
        ].join(' ')}>
            <div className="flex items-center gap-3 min-w-0">
                {p.is_fixed && (
                    <span className="text-xs font-mono text-accent-amber border border-amber-700/40 px-1.5 py-0.5 rounded shrink-0">고정</span>
                )}
                <span className="text-xs font-mono shrink-0" style={{ color: tier.color }}>{tier.label}</span>
                <a href={p.url} target="_blank" rel="noopener noreferrer"
                    className="text-text-primary hover:text-accent-blue transition-colors font-mono text-sm truncate">
                    #{p.problem_id} {p.title}
                </a>
            </div>
            {p.solved
                ? <span className="text-accent-green text-xs font-mono shrink-0">✓ 완료</span>
                : <span className="text-text-muted text-xs font-mono shrink-0">미해결</span>
            }
        </div>
    )
}

function ActiveAssignmentCard({ assignment, onSync, onRefresh, syncing, refreshing }) {
    const solved = assignment.problems.filter(p => p.solved).length
    const total = assignment.problems.length
    const pct = total > 0 ? Math.round((solved / total) * 100) : 0

    return (
        <div className="card space-y-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-text-primary font-semibold">{assignment.defense_title}</h3>
                    <p className="text-text-muted text-xs font-mono mt-0.5">
                        {formatRemaining(assignment.defense_end_at)} 남음
                    </p>
                </div>
                <div className="text-right shrink-0">
                    <span className="font-mono text-lg font-semibold text-text-primary">{solved}/{total}</span>
                    <p className="text-text-muted text-xs">{pct}% 완료</p>
                </div>
            </div>

            <div className="h-1.5 bg-bg-raised rounded-full overflow-hidden">
                <div className="h-full bg-accent-green rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }} />
            </div>

            <div className="space-y-2">
                {assignment.problems.map(p => <ProblemRow key={p.problem_id} p={p} />)}
            </div>

            <div className="flex gap-2 pt-1">
                <button onClick={() => onSync(assignment.defense_id)} disabled={syncing}
                    className="flex-1 py-2 text-sm border border-accent-blue text-accent-blue hover:bg-accent-blue/10 rounded-lg transition-all disabled:opacity-50 font-mono">
                    {syncing ? '갱신 중...' : '제출 현황 갱신'}
                </button>
                {!assignment.refresh_used ? (
                    <button onClick={() => onRefresh(assignment.defense_id)} disabled={refreshing}
                        className="flex-1 py-2 text-sm border border-accent-amber text-accent-amber hover:bg-amber-950/20 rounded-lg transition-all disabled:opacity-50 font-mono">
                        {refreshing ? '교체 중...' : '문제 교체 (1회)'}
                    </button>
                ) : (
                    <div className="flex-1 py-2 text-sm text-center text-text-muted font-mono border border-bg-border rounded-lg">
                        교체 소진
                    </div>
                )}
            </div>
        </div>
    )
}

function EndedAssignmentCard({ assignment }) {
    const [open, setOpen] = useState(false)
    const solved = assignment.problems.filter(p => p.solved).length
    const total = assignment.problems.length
    const pct = total > 0 ? Math.round((solved / total) * 100) : 0

    return (
        <div className="card space-y-0">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between gap-4 text-left"
            >
                <div className="min-w-0">
                    <h3 className="text-text-secondary font-semibold">{assignment.defense_title}</h3>
                    <p className="text-text-muted text-xs font-mono mt-0.5">
                        {formatDate(assignment.defense_end_at)} 종료
                    </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-sm text-text-secondary">{solved}/{total}</span>
                    <div className="w-20 h-1.5 bg-bg-raised rounded-full overflow-hidden">
                        <div className="h-full bg-text-muted rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-text-muted text-xs">{open ? '▲' : '▼'}</span>
                </div>
            </button>

            {open && (
                <div className="space-y-2 mt-4 pt-4 border-t border-bg-border">
                    {assignment.problems.map(p => <ProblemRow key={p.problem_id} p={p} />)}
                </div>
            )}
        </div>
    )
}

export default function Defense() {
    const navigate = useNavigate()
    const user = useAuthStore(s => s.user)
    const setUser = useAuthStore(s => s.setUser)

    const [tab, setTab] = useState('active') // 'active' | 'ended'
    const [activeDefenses, setActiveDefenses] = useState([])
    const [myAssignments, setMyAssignments] = useState([])
    const [loading, setLoading] = useState(true)
    const [joining, setJoining] = useState(null)
    const [syncing, setSyncing] = useState(null)
    const [refreshing, setRefreshing] = useState(null)
    const [modeUpdating, setModeUpdating] = useState(false)
    const [error, setError] = useState('')

    const fetchAll = async () => {
        try {
            const [activeRes, myRes] = await Promise.all([
                getActiveDefenses(),
                getMyAssignments(),
            ])
            setActiveDefenses(activeRes.data)
            setMyAssignments(myRes.data)
        } catch {
            setError('데이터를 불러오지 못했습니다.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        // getMe로 defense_mode 포함한 최신 유저 정보 로드
        getMe().then(r => setUser(r.data)).catch(() => { })
        fetchAll()
    }, [])

    const now = new Date()
    const myActiveAssignments = myAssignments.filter(
        a => new Date(a.defense_end_at) >= now
    )
    const myEndedAssignments = myAssignments.filter(
        a => new Date(a.defense_end_at) < now
    )
    const myDefenseIds = new Set(myAssignments.map(a => a.defense_id))

    const handleJoin = async (defenseId) => {
        setJoining(defenseId)
        setError('')
        try {
            await joinDefense(defenseId)
            await fetchAll()
        } catch (e) {
            setError(e.response?.data?.detail ?? '참가 실패')
        } finally {
            setJoining(null)
        }
    }

    const handleSync = async (defenseId) => {
        setSyncing(defenseId)
        try {
            await syncDefense(defenseId)
            await fetchAll()
        } catch (e) {
            setError(e.response?.data?.detail ?? '갱신 실패')
        } finally {
            setSyncing(null)
        }
    }

    const handleRefresh = async (defenseId) => {
        if (!window.confirm('못 푼 문제를 새 문제로 교체합니다. 이 작업은 1회만 가능합니다.')) return
        setRefreshing(defenseId)
        try {
            await refreshDefense(defenseId)
            await fetchAll()
        } catch (e) {
            setError(e.response?.data?.detail ?? '교체 실패')
        } finally {
            setRefreshing(null)
        }
    }

    const handleModeChange = async (mode) => {
        setModeUpdating(true)
        try {
            await updateDefenseMode(mode)
            setUser({ ...user, defense_mode: mode })
        } catch {
            setError('모드 변경 실패')
        } finally {
            setModeUpdating(false)
        }
    }

    return (
        <div className="min-h-screen bg-bg-base">
            <div className="fixed inset-0 opacity-[0.025] pointer-events-none"
                style={{
                    backgroundImage: 'linear-gradient(#4f9cf9 1px, transparent 1px), linear-gradient(90deg, #4f9cf9 1px, transparent 1px)',
                    backgroundSize: '48px 48px',
                }} />

            <Nav />

            <main className="max-w-4xl mx-auto px-6 py-10 animate-fade-in space-y-10">

                {/* 난이도 모드 설정 */}
                <div className="card space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-text-primary font-semibold">내 난이도 설정</h2>
                        <span className="text-text-muted text-xs font-mono">디펜스 문제 난이도에 적용됩니다</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {MODES.map(m => {
                            const active = user?.defense_mode === m.key
                            return (
                                <button key={m.key} onClick={() => handleModeChange(m.key)}
                                    disabled={modeUpdating}
                                    className={[
                                        'py-3 rounded-lg border transition-all text-left px-4 disabled:opacity-50',
                                        active ? 'border-accent-blue bg-accent-blue/10' : 'border-bg-border hover:border-text-muted',
                                    ].join(' ')}>
                                    <p className={`font-mono text-sm font-semibold ${active ? m.color : 'text-text-secondary'}`}>{m.label}</p>
                                    <p className="text-text-muted text-xs mt-0.5">{m.desc}</p>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-2 text-accent-red text-sm bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">
                        <span className="font-mono text-xs">ERR</span>
                        <span>{error}</span>
                    </div>
                )}

                {/* 진행 중인 디펜스 목록 */}
                <section className="space-y-4">
                    <h2 className="text-text-primary font-semibold text-lg">진행 중인 디펜스</h2>
                    {loading ? (
                        <div className="card animate-pulse h-24" />
                    ) : activeDefenses.length === 0 ? (
                        <div className="card text-center py-10">
                            <p className="text-text-muted text-sm">현재 진행 중인 디펜스가 없습니다.</p>
                        </div>
                    ) : (
                        activeDefenses.map(d => (
                            <div key={d.id} className="card flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                    <h3 className="text-text-primary font-semibold">{d.title}</h3>
                                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                                        {d.tags.map(t => <span key={t} className="tag-badge">{t}</span>)}
                                    </div>
                                    <p className="text-text-muted text-xs font-mono mt-1.5">
                                        문제 {d.problem_count}개 · {formatRemaining(d.end_at)} 남음
                                    </p>
                                </div>
                                {myDefenseIds.has(d.id) ? (
                                    <span className="text-accent-green text-xs font-mono shrink-0">참가 중</span>
                                ) : (
                                    <button onClick={() => handleJoin(d.id)} disabled={joining === d.id}
                                        className="shrink-0 px-4 py-2 bg-accent-blue hover:bg-blue-400 text-bg-base text-sm font-semibold rounded-lg transition-all disabled:opacity-50">
                                        {joining === d.id ? '참가 중...' : '참가하기'}
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </section>

                {/* 내 디펜스 탭 */}
                {myAssignments.length > 0 && (
                    <section className="space-y-4">
                        {/* 탭 헤더 */}
                        <div className="flex items-center gap-1 border-b border-bg-border">
                            <button
                                onClick={() => setTab('active')}
                                className={[
                                    'px-4 py-2 text-sm font-mono transition-colors border-b-2 -mb-px',
                                    tab === 'active'
                                        ? 'border-accent-blue text-text-primary'
                                        : 'border-transparent text-text-muted hover:text-text-secondary',
                                ].join(' ')}
                            >
                                진행 중
                                {myActiveAssignments.length > 0 && (
                                    <span className="ml-1.5 text-xs bg-accent-blue/20 text-accent-blue px-1.5 py-0.5 rounded-full">
                                        {myActiveAssignments.length}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setTab('ended')}
                                className={[
                                    'px-4 py-2 text-sm font-mono transition-colors border-b-2 -mb-px',
                                    tab === 'ended'
                                        ? 'border-text-muted text-text-primary'
                                        : 'border-transparent text-text-muted hover:text-text-secondary',
                                ].join(' ')}
                            >
                                종료된 디펜스
                                {myEndedAssignments.length > 0 && (
                                    <span className="ml-1.5 text-xs bg-bg-raised text-text-muted px-1.5 py-0.5 rounded-full">
                                        {myEndedAssignments.length}
                                    </span>
                                )}
                            </button>
                        </div>

                        {tab === 'active' && (
                            myActiveAssignments.length === 0 ? (
                                <div className="card text-center py-8 text-text-muted text-sm">
                                    참가 중인 진행 중 디펜스가 없습니다.
                                </div>
                            ) : (
                                myActiveAssignments.map(a => (
                                    <ActiveAssignmentCard key={a.id} assignment={a}
                                        onSync={handleSync} onRefresh={handleRefresh}
                                        syncing={syncing === a.defense_id}
                                        refreshing={refreshing === a.defense_id} />
                                ))
                            )
                        )}

                        {tab === 'ended' && (
                            myEndedAssignments.length === 0 ? (
                                <div className="card text-center py-8 text-text-muted text-sm">
                                    종료된 디펜스가 없습니다.
                                </div>
                            ) : (
                                myEndedAssignments.map(a => (
                                    <EndedAssignmentCard key={a.id} assignment={a} />
                                ))
                            )
                        )}
                    </section>
                )}
            </main>
        </div>
    )
}