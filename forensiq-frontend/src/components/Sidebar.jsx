import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  ShieldAlert, Search, FileText, Share2, MapPin,
  LayoutDashboard, Radio, Scan, Copy, CheckCircle2,
  LogOut, Bot, ChevronRight, Sparkles, X
} from 'lucide-react'

const navGroups = [
  {
    title: 'Overview',
    items: [
      { path: '/dashboard', label: 'Dashboard',   icon: LayoutDashboard, badge: null },
      { path: '/threats',   label: 'Threat Feed', icon: Radio,           badge: 'Live' },
    ],
  },
  {
    title: 'Forensic Tools',
    items: [
      { path: '/analyze',      label: 'Profile Analyzer',     icon: Search,       badge: 'AI' },
      { path: '/twitter-bots', label: 'Twitter Bot Directory', icon: Bot,          badge: 'MongoDB' },
      { path: '/deepfake',     label: 'Deepfake Detector',    icon: Scan,         badge: null },
      { path: '/similarity',   label: 'Similarity Scanner',   icon: Copy,         badge: null },
      { path: '/credibility',  label: 'Credibility Scorer',   icon: CheckCircle2, badge: null },
    ],
  },
  {
    title: 'Intelligence & Network',
    items: [
      { path: '/network', label: 'Network Graph',    icon: Share2,   badge: null },
      { path: '/reports', label: 'Evidence Reports', icon: FileText, badge: null },
    ],
  },
]

export default function Sidebar({ mobileOpen, setMobileOpen }) {
  const navigate  = useNavigate()
  const location  = useLocation()

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const user = JSON.parse(
    localStorage.getItem('user') || '{"name":"Admin Investigator","email":"admin@forensiq.com"}'
  )

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{ background: 'linear-gradient(180deg, #0d1b2a 0%, #0a1628 60%, #0d1f35 100%)' }}
      >
        {/* ── Brand ── */}
        <div
          className="h-16 px-5 flex items-center justify-between flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(245,158,11,0.15)' }}
        >
          <NavLink to="/dashboard" className="flex items-center gap-3 group">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white group-hover:scale-105 transition-transform shadow-lg"
              style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', boxShadow: '0 4px 14px rgba(245,158,11,0.35)' }}
            >
              <ShieldAlert style={{ width: '18px', height: '18px' }} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base text-white tracking-tight">ForensIQ</span>
                <span
                  className="text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wide"
                  style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}
                >
                  v2.0
                </span>
              </div>
              <p className="text-[10px] font-semibold leading-none" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Forensic Threat Suite
              </p>
            </div>
          </NavLink>

          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg lg:hidden transition"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            <X style={{ width: '16px', height: '16px' }} />
          </button>
        </div>

        {/* ── Nav Body ── */}
        <nav className="flex-1 px-4 py-5 overflow-y-auto space-y-6 no-scrollbar">
          {navGroups.map((group) => (
            <div key={group.title}>
              <p
                className="px-2 text-[10px] font-extrabold uppercase tracking-widest mb-2"
                style={{ color: 'rgba(255,255,255,0.28)' }}
              >
                {group.title}
              </p>

              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon     = item.icon
                  const isActive = location.pathname === item.path

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen && setMobileOpen(false)}
                      className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150`}
                      style={
                        isActive
                          ? {
                              background: 'linear-gradient(135deg, rgba(245,158,11,0.22) 0%, rgba(217,119,6,0.14) 100%)',
                              border: '1px solid rgba(245,158,11,0.35)',
                              color: '#f59e0b',
                            }
                          : {
                              color: 'rgba(255,255,255,0.55)',
                              border: '1px solid transparent',
                            }
                      }
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                          e.currentTarget.style.color = 'rgba(255,255,255,0.9)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'transparent'
                          e.currentTarget.style.color = 'rgba(255,255,255,0.55)'
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          style={{
                            width: '15px',
                            height: '15px',
                            color: isActive ? '#f59e0b' : 'rgba(255,255,255,0.35)',
                            flexShrink: 0,
                          }}
                        />
                        <span>{item.label}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {item.badge && (
                          <span
                            className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wide"
                            style={
                              isActive
                                ? { background: 'rgba(245,158,11,0.25)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.4)' }
                                : item.badge === 'Live'
                                ? { background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }
                                : item.badge === 'AI'
                                ? { background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)' }
                                : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.1)' }
                            }
                          >
                            {item.badge}
                          </span>
                        )}
                        {isActive && (
                          <ChevronRight style={{ width: '13px', height: '13px', color: '#f59e0b', opacity: 0.75 }} />
                        )}
                      </div>
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}

          {/* ── AI Engine Banner ── */}
          <div
            className="p-4 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(217,119,6,0.06) 100%)',
              border: '1px solid rgba(245,158,11,0.2)',
            }}
          >
            <div className="flex items-center gap-2 text-xs font-bold mb-1.5" style={{ color: '#f59e0b' }}>
              <Sparkles style={{ width: '13px', height: '13px' }} />
              <span>AI Engine Active</span>
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Real-time deepfake & network graph analysis engine active.
            </p>
          </div>
        </nav>

        {/* ── Footer: User ── */}
        <div className="p-4 flex-shrink-0" style={{ borderTop: '1px solid rgba(245,158,11,0.12)' }}>
          <div
            className="flex items-center justify-between p-2.5 rounded-xl mb-3"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div
                className="w-8 h-8 rounded-xl text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 2px 8px rgba(245,158,11,0.3)' }}
              >
                {user.name ? user.name.charAt(0) : 'A'}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-white truncate">{user.name || 'Admin'}</p>
                <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {user.email || 'admin@forensiq.com'}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors"
            style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.22)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)' }}
          >
            <LogOut style={{ width: '13px', height: '13px' }} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  )
}