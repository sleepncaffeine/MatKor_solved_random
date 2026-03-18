import { useNavigate, useLocation } from 'react-router-dom'
import useAuthStore from '../../store/auth'

export default function Nav() {
    const navigate = useNavigate()
    const location = useLocation()
    const user = useAuthStore(s => s.user)

    const logout = () => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        navigate('/login')
    }

    const links = [
        { path: '/dashboard', label: '대시보드' },
        { path: '/recommend', label: '문제 추천' },
        { path: '/defense', label: '랜덤 디펜스' },
    ]

    return (
        <header className="border-b border-bg-border bg-bg-surface/80 backdrop-blur sticky top-0 z-10">
            <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
                {/* 로고 */}
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 group"
                >
                    <span className="font-mono text-accent-blue font-semibold group-hover:text-blue-300 transition-colors">BOJ</span>
                    <span className="text-bg-border">/</span>
                    <span className="font-mono text-text-secondary group-hover:text-text-primary transition-colors">def</span>
                </button>

                <nav className="flex items-center gap-6">
                    {links.map(({ path, label }) => {
                        const active = location.pathname === path
                        return (
                            <button
                                key={path}
                                onClick={() => navigate(path)}
                                className={[
                                    'text-sm transition-colors',
                                    active
                                        ? 'text-text-primary border-b border-accent-blue pb-0.5'
                                        : 'text-text-secondary hover:text-text-primary',
                                ].join(' ')}
                            >
                                {label}
                            </button>
                        )
                    })}

                    {user?.role === 'admin' && (
                        <>
                            <button
                                onClick={() => navigate('/admin/users')}
                                className={`text-sm font-mono transition-colors ${location.pathname.startsWith('/admin') ? 'text-accent-amber border-b border-accent-amber pb-0.5' : 'text-accent-amber/70 hover:text-accent-amber'}`}
                            >
                                admin
                            </button>
                            <button
                                onClick={() => navigate('/admin/defense')}
                                className={`text-sm font-mono transition-colors ${location.pathname === '/admin/defense' ? 'text-accent-amber border-b border-accent-amber pb-0.5' : 'text-accent-amber/70 hover:text-accent-amber'}`}
                            >
                                defense
                            </button>
                        </>
                    )}

                    <button
                        onClick={logout}
                        className="text-text-muted hover:text-accent-red text-sm transition-colors"
                    >
                        로그아웃
                    </button>
                </nav>
            </div>
        </header>
    )
}