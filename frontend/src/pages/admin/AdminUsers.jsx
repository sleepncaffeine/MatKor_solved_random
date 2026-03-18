import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Nav from '../../components/layout/Nav'
import useAuthStore from '../../store/auth'
import client from '../../api/client'

const TIER_LABELS = [
  'Unrated',
  'Bronze V', 'Bronze IV', 'Bronze III', 'Bronze II', 'Bronze I',
  'Silver V', 'Silver IV', 'Silver III', 'Silver II', 'Silver I',
  'Gold V', 'Gold IV', 'Gold III', 'Gold II', 'Gold I',
  'Platinum V', 'Platinum IV', 'Platinum III', 'Platinum II', 'Platinum I',
  'Diamond V', 'Diamond IV', 'Diamond III', 'Diamond II', 'Diamond I',
  'Ruby V', 'Ruby IV', 'Ruby III', 'Ruby II', 'Ruby I',
]

const TIER_COLORS = [
  '#6b7280',
  '#ad5600', '#ad5600', '#ad5600', '#ad5600', '#ad5600',
  '#435f7a', '#435f7a', '#435f7a', '#435f7a', '#435f7a',
  '#ec9a00', '#ec9a00', '#ec9a00', '#ec9a00', '#ec9a00',
  '#27e2a4', '#27e2a4', '#27e2a4', '#27e2a4', '#27e2a4',
  '#00b4fc', '#00b4fc', '#00b4fc', '#00b4fc', '#00b4fc',
  '#ff0062', '#ff0062', '#ff0062', '#ff0062', '#ff0062',
]

// ---------- API helpers ----------
const adminApi = {
  getUsers: () => client.get('/admin/users'),
  getUser: (id) => client.get(`/admin/users/${id}`),
  getUserStats: (id) => client.get(`/admin/users/${id}/stats`),
  updateHandle: (id, handle) => client.put(`/admin/users/${id}/handle`, { handle }),
  overrideTier: (id, tier) => client.put(`/admin/users/${id}/tier`, { tier }),
  updateStatus: (id, is_active) => client.patch(`/admin/users/${id}/status`, { is_active }),
  deleteUser: (id) => client.delete(`/admin/users/${id}`),
}

// ---------- Sub-components ----------
function Badge({ children, color = 'default' }) {
  const styles = {
    default: 'bg-bg-raised border-bg-border text-text-secondary',
    green: 'bg-green-950/30 border-green-800/40 text-accent-green',
    red: 'bg-red-950/30 border-red-900/40 text-accent-red',
    amber: 'bg-amber-950/30 border-amber-800/40 text-accent-amber',
    blue: 'bg-blue-950/30 border-blue-800/40 text-accent-blue',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono border ${styles[color]}`}>
      {children}
    </span>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-bg-surface border border-bg-border rounded-xl w-full max-w-lg max-h-[85vh] flex flex-col animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-bg-border shrink-0">
          <h2 className="text-text-primary font-semibold">{title}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors text-xl leading-none">&times;</button>
        </div>
        <div className="overflow-y-auto px-6 py-4 flex-1">{children}</div>
      </div>
    </div>
  )
}

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-bg-surface border border-bg-border rounded-xl w-full max-w-sm p-6 animate-fade-in space-y-4">
        <p className="text-text-primary text-sm">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary border border-bg-border rounded-lg transition-colors">
            취소
          </button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm text-white bg-accent-red hover:bg-red-400 rounded-lg transition-colors">
            확인
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------- User Detail Modal ----------
function UserDetailModal({ user, onClose, onUpdated }) {
  const [handle, setHandle] = useState(user.boj_handle ?? '')
  const [tierInput, setTierInput] = useState(String(user.tier))
  const [stats, setStats] = useState([])
  const [tab, setTab] = useState('info')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    adminApi.getUserStats(user.id).then((r) => setStats(r.data)).catch(() => { })
  }, [user.id])

  const flash = (text, type = 'ok') => {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 3000)
  }

  const saveHandle = async () => {
    setSaving(true)
    try {
      await adminApi.updateHandle(user.id, handle)
      flash('핸들 업데이트 완료')
      onUpdated()
    } catch (e) {
      flash(e.response?.data?.detail ?? '실패', 'err')
    } finally { setSaving(false) }
  }

  const saveTier = async () => {
    const t = parseInt(tierInput)
    if (isNaN(t) || t < 0 || t > 30) { flash('0~30 사이 값', 'err'); return }
    setSaving(true)
    try {
      await adminApi.overrideTier(user.id, t)
      flash('티어 override 완료')
      onUpdated()
    } catch (e) {
      flash(e.response?.data?.detail ?? '실패', 'err')
    } finally { setSaving(false) }
  }

  const toggleStatus = async () => {
    setSaving(true)
    try {
      await adminApi.updateStatus(user.id, !user.is_active)
      flash(user.is_active ? '계정 정지됨' : '계정 활성화됨')
      onUpdated()
    } catch (e) {
      flash(e.response?.data?.detail ?? '실패', 'err')
    } finally { setSaving(false) }
  }

  const TABS = ['info', '태그 통계']

  return (
    <Modal title={`유저 상세 — ${user.email}`} onClose={onClose}>
      {/* 탭 */}
      <div className="flex gap-1 mb-6 border-b border-bg-border -mx-6 px-6">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              'pb-3 px-1 text-sm font-mono transition-colors border-b-2 -mb-px',
              tab === t
                ? 'border-accent-blue text-accent-blue'
                : 'border-transparent text-text-muted hover:text-text-secondary',
            ].join(' ')}
          >
            {t}
          </button>
        ))}
      </div>

      {msg && (
        <div className={`mb-4 px-3 py-2 rounded-lg text-sm border ${msg.type === 'ok'
          ? 'bg-green-950/30 border-green-800/40 text-accent-green'
          : 'bg-red-950/30 border-red-900/40 text-accent-red'
          }`}>
          {msg.text}
        </div>
      )}

      {/* info 탭 */}
      {tab === 'info' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-bg-raised rounded-lg p-3">
              <p className="text-text-muted text-xs mb-1 font-mono">role</p>
              <Badge color={user.role === 'admin' ? 'amber' : 'default'}>{user.role}</Badge>
            </div>
            <div className="bg-bg-raised rounded-lg p-3">
              <p className="text-text-muted text-xs mb-1 font-mono">status</p>
              <Badge color={user.is_active ? 'green' : 'red'}>{user.is_active ? 'active' : 'inactive'}</Badge>
            </div>
            <div className="bg-bg-raised rounded-lg p-3">
              <p className="text-text-muted text-xs mb-1 font-mono">tier</p>
              <span className="font-mono text-sm font-semibold" style={{ color: TIER_COLORS[user.tier] }}>
                {TIER_LABELS[user.tier] ?? 'Unrated'}
              </span>
              {user.tier_override && <Badge color="amber" className="ml-2">override</Badge>}
            </div>
            <div className="bg-bg-raised rounded-lg p-3">
              <p className="text-text-muted text-xs mb-1 font-mono">rating</p>
              <span className="font-mono text-sm text-text-primary">{user.rating}</span>
            </div>
          </div>

          {/* 핸들 수정 */}
          <div className="space-y-2">
            <label className="text-text-secondary text-xs font-mono uppercase tracking-wider">BOJ Handle</label>
            <div className="flex gap-2">
              <input
                className="input-base flex-1"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="boj_handle"
              />
              <button
                onClick={saveHandle}
                disabled={saving}
                className="px-4 py-2 bg-accent-blue hover:bg-blue-400 text-bg-base text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 shrink-0"
              >
                저장
              </button>
            </div>
          </div>

          {/* 티어 override */}
          <div className="space-y-2">
            <label className="text-text-secondary text-xs font-mono uppercase tracking-wider">
              Tier Override <span className="text-text-muted normal-case">(0 = Unrated, 1~30)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min={0} max={30}
                className="input-base flex-1"
                value={tierInput}
                onChange={(e) => setTierInput(e.target.value)}
              />
              <button
                onClick={saveTier}
                disabled={saving}
                className="px-4 py-2 bg-accent-amber hover:bg-amber-400 text-bg-base text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 shrink-0"
              >
                적용
              </button>
            </div>
            <p className="text-text-muted text-xs">설정 시 핸들 재등록 시에도 유지됩니다.</p>
          </div>

          {/* 계정 상태 */}
          <button
            onClick={toggleStatus}
            disabled={saving}
            className={[
              'w-full py-2.5 rounded-lg text-sm font-semibold border transition-all disabled:opacity-50',
              user.is_active
                ? 'border-accent-red text-accent-red hover:bg-red-950/30'
                : 'border-accent-green text-accent-green hover:bg-green-950/30',
            ].join(' ')}
          >
            {user.is_active ? '계정 정지' : '계정 활성화'}
          </button>
        </div>
      )}

      {/* 태그 통계 탭 */}
      {tab === '태그 통계' && (
        <div className="space-y-2">
          {stats.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-8">태그 데이터 없음</p>
          ) : (
            stats
              .sort((a, b) => b.solved_count - a.solved_count)
              .slice(0, 20)
              .map((s) => (
                <div key={s.tag_key} className="flex items-center gap-3">
                  <span className="text-text-secondary text-sm font-mono w-40 truncate shrink-0">{s.tag_name_ko}</span>
                  <div className="flex-1 h-1.5 bg-bg-raised rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min((s.level / 30) * 100, 100)}%`,
                        backgroundColor: TIER_COLORS[s.level] ?? '#6b7280',
                      }}
                    />
                  </div>
                  <span className="text-text-muted text-xs font-mono w-10 text-right shrink-0">{s.solved_count}</span>
                </div>
              ))
          )}
        </div>
      )}

    </Modal>
  )
}

// ---------- Main Page ----------
export default function AdminUsers() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [signupKey, setSignupKey] = useState(null)
  const [keyRefreshing, setKeyRefreshing] = useState(false)

  const fetchUsers = () => {
    setLoading(true)
    adminApi.getUsers()
      .then((r) => setUsers(r.data))
      .finally(() => setLoading(false))
  }

  const fetchSignupKey = () => {
    client.get('/admin/signup-key')
      .then((r) => setSignupKey(r.data))
      .catch(() => { })
  }

  const handleKeyRefresh = async () => {
    setKeyRefreshing(true)
    try {
      const { data } = await client.post('/admin/signup-key/refresh')
      setSignupKey({ ...data, expires_in: '24h 0m' })
    } finally {
      setKeyRefreshing(false)
    }
  }

  useEffect(() => { fetchUsers(); fetchSignupKey() }, [])

  const handleDelete = async () => {
    try {
      await adminApi.deleteUser(deleteTarget.id)
      setDeleteTarget(null)
      fetchUsers()
    } catch (e) {
      alert(e.response?.data?.detail ?? '삭제 실패')
    }
  }

  const filtered = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.boj_handle ?? '').toLowerCase().includes(search.toLowerCase())
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

      {/* 헤더 */}
      <Nav />

      <main className="max-w-6xl mx-auto px-6 py-10 animate-fade-in space-y-6">
        {/* 상단 */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-text-primary font-semibold text-lg">유저 관리</h1>
            <p className="text-text-muted text-sm font-mono">{users.length} users total</p>
          </div>
          <input
            type="text"
            className="input-base w-64"
            placeholder="이메일 또는 핸들 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* 회원가입 키 */}
        <div className="card flex items-center justify-between gap-6">
          <div>
            <p className="text-text-muted text-xs font-mono uppercase tracking-wider mb-1">회원가입 키</p>
            {signupKey ? (
              <div className="flex items-center gap-3">
                <span className="font-mono text-3xl font-semibold tracking-[0.3em] text-accent-blue">
                  {signupKey.key}
                </span>
                <span className="text-text-muted text-xs font-mono">만료: {signupKey.expires_in}</span>
              </div>
            ) : (
              <span className="text-text-muted text-sm font-mono">로딩 중...</span>
            )}
          </div>
          <button
            onClick={handleKeyRefresh}
            disabled={keyRefreshing}
            className="px-4 py-2 text-sm border border-bg-border text-text-muted hover:border-text-muted hover:text-text-secondary rounded-lg transition-all disabled:opacity-50 font-mono shrink-0"
          >
            {keyRefreshing ? '갱신 중...' : '키 갱신'}
          </button>
        </div>

        {/* 테이블 */}
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bg-border">
                {['이메일', '핸들', '티어', '레이팅', '상태', '역할', '가입일', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-text-muted text-xs font-mono uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-bg-border animate-pulse">
                    {[...Array(8)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3 bg-bg-raised rounded w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-text-muted text-sm">
                    유저가 없습니다.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-bg-border hover:bg-bg-raised/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-text-primary font-mono text-xs">{u.email}</td>
                    <td className="px-4 py-3">
                      {u.boj_handle ? (
                        <span className="font-mono text-accent-blue text-xs">{u.boj_handle}</span>
                      ) : (
                        <span className="text-text-muted text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold" style={{ color: TIER_COLORS[u.tier] }}>
                        {TIER_LABELS[u.tier] ?? '?'}
                      </span>
                      {u.tier_override && (
                        <span className="ml-1 text-accent-amber text-xs">*</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-text-secondary">{u.rating}</td>
                    <td className="px-4 py-3">
                      <Badge color={u.is_active ? 'green' : 'red'}>
                        {u.is_active ? 'active' : 'inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={u.role === 'admin' ? 'amber' : 'default'}>{u.role}</Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-text-muted">
                      {new Date(u.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedUser(u)}
                          className="text-xs text-accent-blue hover:underline font-mono"
                        >
                          편집
                        </button>
                        {u.id !== user?.id && (
                          <button
                            onClick={() => setDeleteTarget(u)}
                            className="text-xs text-accent-red hover:underline font-mono"
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* 유저 상세 모달 */}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdated={() => {
            fetchUsers()
            adminApi.getUser(selectedUser.id)
              .then((r) => setSelectedUser(r.data))
              .catch(() => { })
          }}
        />
      )}

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <ConfirmModal
          message={`${deleteTarget.email} 계정을 삭제합니다. 이 작업은 되돌릴 수 없습니다.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}