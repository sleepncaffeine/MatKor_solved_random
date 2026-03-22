import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Nav from '../../components/layout/Nav'
import useAuthStore from '../../store/auth'
import {
    adminListDefenses, adminCreateDefense,
    adminToggleDefense, adminDeleteDefense,
    adminGetParticipants,
    adminEndDefenseEarly,
} from '../../api/defense'

const TAG_PRESETS = ['dp', 'graphs', 'greedy', 'math', 'sorting', 'bfs', 'dfs', 'tree', 'string', 'binary_search']

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

function ProblemList({ problems }) {
    return (
        <div className="mt-2 space-y-1 pl-2 border-l-2 border-bg-border">
            {problems.map(p => {
                const tier = TIER_TABLE[p.level] ?? TIER_TABLE[0]
                return (
                    <div key={p.problem_id} className="flex items-center gap-2 text-xs font-mono">
                        {p.is_fixed && (
                            <span className="text-accent-amber border border-amber-700/40 px-1 rounded shrink-0">고정</span>
                        )}
                        <span className="shrink-0" style={{ color: tier.color }}>{tier.label}</span>
                        <a
                            href={`https://www.acmicpc.net/problem/${p.problem_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-text-secondary hover:text-accent-blue truncate"
                        >
                            #{p.problem_id} {p.title}
                        </a>
                        {p.solved
                            ? <span className="text-accent-green shrink-0 ml-auto">✓</span>
                            : <span className="text-text-muted shrink-0 ml-auto">-</span>
                        }
                    </div>
                )
            })}
        </div>
    )
}

function ParticipantModal({ defenseId, title, onClose }) {
    const [rows, setRows] = useState([])
    const [loading, setLoading] = useState(true)
    const [expanded, setExpanded] = useState(null)

    useEffect(() => {
        adminGetParticipants(defenseId).then(r => {
            setRows(r.data)
            setLoading(false)
        })
    }, [defenseId])

    const toggleExpand = (userId) =>
        setExpanded(prev => prev === userId ? null : userId)

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="card w-full max-w-2xl max-h-[85vh] overflow-auto space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                    <h3 className="text-text-primary font-semibold">{title} — 참가자</h3>
                    <button onClick={onClose} className="text-text-muted hover:text-text-primary text-lg leading-none">x</button>
                </div>
                {loading ? <div className="animate-pulse h-20 bg-bg-raised rounded" /> : (
                    rows.length === 0 ? (
                        <p className="text-text-muted text-sm text-center py-8">참가자 없음</p>
                    ) : (
                        <div className="space-y-1">
                            {/* 헤더 */}
                            <div className="grid grid-cols-[1fr_1fr_80px_60px_50px_24px] gap-2 text-text-muted text-xs font-mono px-2 pb-1 border-b border-bg-border">
                                <span>핸들</span>
                                <span>이메일</span>
                                <span className="text-center">모드</span>
                                <span className="text-center">진행</span>
                                <span className="text-center">교체</span>
                                <span />
                            </div>
                            {rows.map(r => (
                                <div key={r.user_id}>
                                    <button
                                        onClick={() => toggleExpand(r.user_id)}
                                        className="w-full grid grid-cols-[1fr_1fr_80px_60px_50px_24px] gap-2 text-xs font-mono px-2 py-2 rounded hover:bg-bg-raised transition-colors text-left"
                                    >
                                        <span className="text-accent-blue truncate">{r.boj_handle ?? '-'}</span>
                                        <span className="text-text-secondary truncate">{r.email}</span>
                                        <span className={`text-center ${r.defense_mode === 'challenge' ? 'text-accent-amber' : r.defense_mode === 'practice' ? 'text-accent-green' : 'text-accent-blue'}`}>
                                            {r.defense_mode}
                                        </span>
                                        <span className="text-center text-text-primary">{r.solved}/{r.total}</span>
                                        <span className="text-center text-text-muted">{r.refresh_used ? '소진' : '-'}</span>
                                        <span className="text-text-muted text-center">{expanded === r.user_id ? '▲' : '▼'}</span>
                                    </button>
                                    {expanded === r.user_id && r.problems?.length > 0 && (
                                        <div className="px-3 pb-2">
                                            <ProblemList problems={r.problems} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )
                )}
            </div>
        </div>
    )
}

function CreateModal({ onClose, onCreate }) {
    const [form, setForm] = useState({
        title: '',
        tags: [],
        problem_count: 5,
        start_at: '',
        end_at: '',
        fixed_problem_ids: '',
    })
    const [tagInput, setTagInput] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')

    const addTag = (t) => {
        const tag = t.trim()
        if (tag && !form.tags.includes(tag)) setForm(f => ({ ...f, tags: [...f.tags, tag] }))
        setTagInput('')
    }
    const removeTag = (t) => setForm(f => ({ ...f, tags: f.tags.filter(x => x !== t) }))

    const handleSubmit = async () => {
        if (!form.title || form.tags.length === 0 || !form.start_at || !form.end_at) {
            setError('제목, 태그, 기간은 필수입니다.')
            return
        }
        if (new Date(form.end_at) <= new Date(form.start_at)) {
            setError('종료 시각이 시작 시각보다 늦어야 합니다.')
            return
        }
        setSubmitting(true)
        try {
            const fixed = form.fixed_problem_ids
                .split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
            await onCreate({
                title: form.title,
                tags: form.tags,
                problem_count: form.problem_count,
                start_at: new Date(form.start_at).toISOString(),
                end_at: new Date(form.end_at).toISOString(),
                fixed_problem_ids: fixed,
            })
            onClose()
        } catch (e) {
            setError(e.response?.data?.detail ?? '생성 실패')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="card w-full max-w-lg space-y-5" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                    <h3 className="text-text-primary font-semibold">디펜스 생성</h3>
                    <button onClick={onClose} className="text-text-muted hover:text-text-primary text-lg leading-none">x</button>
                </div>

                {error && <p className="text-accent-red text-xs font-mono bg-red-950/30 px-3 py-2 rounded">{error}</p>}

                <div className="space-y-3">
                    <div>
                        <label className="text-text-muted text-xs mb-1 block">제목</label>
                        <input className="input-base w-full" value={form.title}
                            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                            placeholder="디펜스 제목" />
                    </div>

                    <div>
                        <label className="text-text-muted text-xs mb-1 block">태그</label>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                            {form.tags.map(t => (
                                <span key={t} className="tag-badge flex items-center gap-1">
                                    {t}
                                    <button onClick={() => removeTag(t)} className="text-text-muted hover:text-accent-red leading-none">x</button>
                                </span>
                            ))}
                        </div>
                        <input className="input-base w-full" value={tagInput}
                            onChange={e => setTagInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addTag(tagInput)}
                            placeholder="태그 입력 후 Enter" />
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {TAG_PRESETS.map(t => (
                                <button key={t} onClick={() => addTag(t)}
                                    className={`text-xs px-2 py-0.5 rounded border transition-colors ${form.tags.includes(t) ? 'border-accent-blue text-accent-blue' : 'border-bg-border text-text-muted hover:border-text-muted'}`}>
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-text-muted text-xs mb-1 block">문제 수</label>
                            <input type="number" min="1" max="20" className="input-base w-full"
                                value={form.problem_count}
                                onChange={e => setForm(f => ({ ...f, problem_count: parseInt(e.target.value) || 1 }))} />
                        </div>
                        <div>
                            <label className="text-text-muted text-xs mb-1 block">고정 문제 ID (쉼표 구분)</label>
                            <input className="input-base w-full" value={form.fixed_problem_ids}
                                onChange={e => setForm(f => ({ ...f, fixed_problem_ids: e.target.value }))}
                                placeholder="1000, 1001" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-text-muted text-xs mb-1 block">시작 시각</label>
                            <input type="datetime-local" className="input-base w-full" value={form.start_at}
                                onChange={e => setForm(f => ({ ...f, start_at: e.target.value }))} />
                        </div>
                        <div>
                            <label className="text-text-muted text-xs mb-1 block">종료 시각</label>
                            <input type="datetime-local" className="input-base w-full" value={form.end_at}
                                onChange={e => setForm(f => ({ ...f, end_at: e.target.value }))} />
                        </div>
                    </div>
                </div>

                <button onClick={handleSubmit} disabled={submitting} className="btn-primary w-full disabled:opacity-50">
                    {submitting ? '생성 중...' : '디펜스 생성'}
                </button>
            </div>
        </div>
    )
}

function formatRange(start, end) {
    const fmt = d => new Date(d).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    return `${fmt(start)} ~ ${fmt(end)}`
}

export default function AdminDefense() {
    const navigate = useNavigate()
    const [defenses, setDefenses] = useState([])
    const [loading, setLoading] = useState(true)
    const [showCreate, setShowCreate] = useState(false)
    const [viewParticipants, setViewParticipants] = useState(null)
    const [error, setError] = useState('')

    const fetchDefenses = async () => {
        try {
            const r = await adminListDefenses()
            setDefenses(r.data)
        } catch { setError('불러오기 실패') }
        finally { setLoading(false) }
    }

    useEffect(() => { fetchDefenses() }, [])

    const handleCreate = async (data) => {
        await adminCreateDefense(data)
        await fetchDefenses()
    }

    const handleToggle = async (id) => {
        await adminToggleDefense(id)
        await fetchDefenses()
    }

    const handleEarlyEnd = async (id, title) => {
        if (!window.confirm(`"${title}" 을 지금 즉시 종료합니까?`)) return
        try {
            await adminEndDefenseEarly(id)
            await fetchDefenses()
        } catch { setError('조기 종료 실패') }
    }

    const handleDelete = async (id, title) => {
        if (!window.confirm(`"${title}" 을 삭제하시겠습니까?`)) return
        try {
            await adminDeleteDefense(id)
            await fetchDefenses()
        } catch { setError('삭제 실패') }
    }

    const now = new Date()
    const isLive = (d) => d.is_active && new Date(d.start_at) <= now && new Date(d.end_at) >= now

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

            <main className="max-w-5xl mx-auto px-6 py-10 animate-fade-in space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-semibold text-text-primary">랜덤 디펜스 관리</h1>
                    <button onClick={() => setShowCreate(true)} className="btn-primary">+ 디펜스 생성</button>
                </div>

                {error && <p className="text-accent-red text-xs font-mono">{error}</p>}

                {loading ? (
                    <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="card animate-pulse h-20" />)}</div>
                ) : defenses.length === 0 ? (
                    <div className="card text-center py-12 text-text-muted text-sm">아직 디펜스가 없습니다.</div>
                ) : (
                    <div className="space-y-3">
                        {defenses.map(d => (
                            <div key={d.id} className="card flex items-center gap-4">
                                <div className="flex-1 min-w-0 space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <span className="text-text-primary font-semibold">{d.title}</span>
                                        {isLive(d) && (
                                            <span className="text-xs font-mono bg-green-950/40 text-accent-green border border-accent-green/30 px-1.5 py-0.5 rounded">LIVE</span>
                                        )}
                                        {!d.is_active && (
                                            <span className="text-xs font-mono bg-bg-raised text-text-muted border border-bg-border px-1.5 py-0.5 rounded">비활성</span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {d.tags.map(t => <span key={t} className="tag-badge">{t}</span>)}
                                        {(d.fixed_problem_ids?.length > 0) && (
                                            <span className="text-xs font-mono text-accent-amber border border-amber-700/40 px-1.5 py-0.5 rounded">
                                                고정 {d.fixed_problem_ids.length}문제
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-text-muted text-xs font-mono">{d.problem_count}문제 · {formatRange(d.start_at, d.end_at)}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button onClick={() => setViewParticipants(d)}
                                        className="px-3 py-1.5 text-xs border border-bg-border text-text-secondary hover:border-text-muted hover:text-text-primary rounded transition-colors font-mono">
                                        참가자
                                    </button>
                                    {isLive(d) && (
                                        <button onClick={() => handleEarlyEnd(d.id, d.title)}
                                            className="px-3 py-1.5 text-xs border border-red-900/40 text-accent-red hover:bg-red-950/20 rounded transition-colors font-mono">
                                            조기 종료
                                        </button>
                                    )}
                                    <button onClick={() => handleToggle(d.id)}
                                        className={`px-3 py-1.5 text-xs border rounded transition-colors font-mono ${d.is_active ? 'border-accent-amber/50 text-accent-amber hover:bg-amber-950/20' : 'border-accent-green/50 text-accent-green hover:bg-green-950/20'}`}>
                                        {d.is_active ? '비활성화' : '활성화'}
                                    </button>
                                    <button onClick={() => handleDelete(d.id, d.title)}
                                        className="px-3 py-1.5 text-xs border border-red-900/40 text-accent-red hover:bg-red-950/20 rounded transition-colors font-mono">
                                        삭제
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
            {viewParticipants && (
                <ParticipantModal
                    defenseId={viewParticipants.id}
                    title={viewParticipants.title}
                    onClose={() => setViewParticipants(null)}
                />
            )}
        </div>
    )
}