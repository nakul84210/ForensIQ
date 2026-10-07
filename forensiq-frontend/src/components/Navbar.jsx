import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Search, Bell, CheckCircle2, AlertTriangle, Layers, Sparkles, Menu } from 'lucide-react'

export default function Navbar({ onOpenMobileMenu }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const [searchQuery,       setSearchQuery]       = useState('')
  const [showNotifications, setShowNotifications] = useState(false)

  const getPageTitle = () => {
    const map = {
      '/dashboard':    'Forensic Command Center',
      '/analyze':      'Profile Risk Analysis',
      '/twitter-bots': 'Twitter Bot Directory',
      '/deepfake':     'AI Deepfake Detector',
      '/similarity':   'Content Similarity Scanner',
      '/credibility':  'Account Credibility Scorer',
      '/network':      'Network Graph Inspector',
      '/heatmap':      'Global Misinformation Heatmap',
      '/threats':      'Live Threat Feed',
      '/reports':      'Forensic Evidence Reports',
    }
    return map[location.pathname] || 'Dashboard'
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/analyze?q=${encodeURIComponent(searchQuery.trim().replace(/^@/, ''))}`)
    }
  }

  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between px-5"
      style={{
        height: '60px',
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      {/* Left – breadcrumb + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 rounded-lg transition lg:hidden"
          style={{ color: '#94a3b8' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#f59e0b'; e.currentTarget.style.background = '#fffbeb' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent' }}
        >
          <Menu style={{ width: '18px', height: '18px' }} />
        </button>

        <div>
          <div className="flex items-center gap-1.5" style={{ fontSize: '11px', fontWeight: 600 }}>
            <Layers style={{ width: '13px', height: '13px', color: '#f59e0b', flexShrink: 0 }} />
            <span style={{ color: '#334155', fontWeight: 700 }}>ForensIQ</span>
            <span style={{ color: '#cbd5e1', fontWeight: 400 }}>/</span>
            <span style={{ color: '#d97706', fontWeight: 600 }}>{getPageTitle()}</span>
          </div>
          <p
            className="hidden sm:block"
            style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginTop: '1px', letterSpacing: '-0.01em' }}
          >
            {getPageTitle()}
          </p>
        </div>
      </div>

      {/* Center – search */}
      <form
        onSubmit={handleSearchSubmit}
        className="hidden md:flex items-center w-full relative"
        style={{ maxWidth: '300px', margin: '0 16px' }}
      >
        <Search style={{ width: '14px', height: '14px', position: 'absolute', left: '12px', color: '#94a3b8', pointerEvents: 'none' }} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search profile or report..."
          style={{
            width: '100%',
            height: '36px',
            background: '#f8fafc',
            border: '1.5px solid #e2e8f0',
            borderRadius: '9px',
            paddingLeft: '34px',
            paddingRight: '46px',
            fontSize: '12.5px',
            fontWeight: 500,
            color: '#0f172a',
            fontFamily: 'inherit',
            outline: 'none',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#f59e0b'
            e.target.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.15)'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#e2e8f0'
            e.target.style.boxShadow = 'none'
          }}
        />
        <kbd style={{ position: 'absolute', right: '10px', fontSize: '10px', fontFamily: 'inherit', fontWeight: 600, color: '#94a3b8', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '1px 5px' }}>
          ⌘K
        </kbd>
      </form>

      {/* Right – status + notifications + CTA */}
      <div className="flex items-center gap-2">

        {/* Backend status badge */}
        <div
          className="hidden sm:flex items-center gap-1.5 px-3 rounded-full"
          style={{ height: '28px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', fontSize: '11px', fontWeight: 600 }}
        >
          <span className="relative flex" style={{ width: '7px', height: '7px' }}>
            <span className="animate-ping absolute inline-flex rounded-full" style={{ width: '100%', height: '100%', background: '#4ade80', opacity: 0.65 }} />
            <span className="relative inline-flex rounded-full" style={{ width: '7px', height: '7px', background: '#22c55e' }} />
          </span>
          <span>Backend Connected</span>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            id="notifications-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            style={{
              width: '36px', height: '36px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '9px', background: '#f8fafc', border: '1.5px solid #e2e8f0',
              color: '#64748b', cursor: 'pointer', position: 'relative', transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#fffbeb'; e.currentTarget.style.borderColor = '#fed7aa' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0' }}
          >
            <Bell style={{ width: '15px', height: '15px' }} />
            <span style={{ position: 'absolute', top: '6px', right: '6px', width: '7px', height: '7px', borderRadius: '50%', background: '#f59e0b', border: '2px solid #fff' }} />
          </button>

          {showNotifications && (
            <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: '300px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', padding: '16px', zIndex: 50 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9', marginBottom: '10px' }}>
                <h3 style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
                  Alerts &amp; Notifications
                </h3>
                <span style={{ fontSize: '10px', fontWeight: 700, background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', borderRadius: '9999px', padding: '2px 8px' }}>
                  2 New
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {[
                  { icon: AlertTriangle, color: '#f59e0b', title: 'Bot Cluster Detected', desc: 'Ensemble classifier scanned 7,642 accounts', time: 'Just now' },
                  { icon: CheckCircle2, color: '#22c55e', title: 'SHAP Explainability Ready', desc: 'TreeExplainer metrics updated', time: '5m ago' },
                ].map(({ icon: Icon, color, title, desc, time }, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '8px', borderRadius: '8px' }}>
                    <Icon style={{ width: '14px', height: '14px', color, flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <p style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', margin: 0 }}>{title}</p>
                      <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>{desc}</p>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>{time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        <button
          id="new-analysis-btn"
          onClick={() => navigate('/analyze')}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            height: '36px', padding: '0 14px', borderRadius: '9px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: '#0d1b2a', fontSize: '12.5px', fontWeight: 700,
            fontFamily: 'inherit', border: 'none', cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(245,158,11,0.35)', whiteSpace: 'nowrap',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #fcd34d 0%, #f59e0b 100%)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(245,158,11,0.45)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(245,158,11,0.35)' }}
        >
          <Sparkles style={{ width: '13px', height: '13px' }} />
          <span className="hidden sm:inline">+ New Analysis</span>
        </button>
      </div>
    </header>
  )
}
