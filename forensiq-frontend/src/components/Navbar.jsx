import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Search, Bell, CheckCircle2, AlertTriangle, Layers, Sparkles, Menu } from 'lucide-react'

export default function Navbar({ onOpenMobileMenu }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const [searchQuery,        setSearchQuery]        = useState('')
  const [showNotifications,  setShowNotifications]  = useState(false)

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
    <header className="sticky top-0 z-40 h-16 bg-white border-b border-slate-200/80 px-5 flex items-center justify-between shadow-sm">

      {/* Left */}
      <div className="flex items-center gap-3">
        <button onClick={onOpenMobileMenu} className="p-2 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition lg:hidden">
          <Menu style={{ width: '20px', height: '20px' }} />
        </button>
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
            <Layers style={{ width: '14px', height: '14px' }} className="text-amber-500" />
            <span className="text-slate-700 font-bold">ForensIQ</span>
            <span>/</span>
            <span className="font-bold" style={{ color: '#d97706' }}>{getPageTitle()}</span>
          </div>
          <h1 className="text-sm font-extrabold text-slate-900 hidden sm:block tracking-tight leading-tight">
            {getPageTitle()}
          </h1>
        </div>
      </div>

      {/* Center: Search */}
      <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center max-w-xs xl:max-w-sm w-full relative">
        <Search style={{ width: '16px', height: '16px' }} className="absolute left-3.5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search profile, bot net, or report... (Press ⌘K)"
          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-14 py-2 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition"
          style={{ '--tw-ring-color': 'rgba(245,158,11,0.4)' }}
          onFocus={(e) => { e.target.style.borderColor = '#f59e0b'; e.target.style.boxShadow = '0 0 0 2px rgba(245,158,11,0.2)' }}
          onBlur={(e)  => { e.target.style.borderColor = ''; e.target.style.boxShadow = '' }}
        />
        <kbd className="absolute right-3 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded">⌘K</kbd>
      </form>

      {/* Right */}
      <div className="flex items-center gap-2.5">

        {/* Backend status */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px]">Backend Connected</span>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2.5 rounded-xl bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-200 text-slate-500 relative transition-colors"
          >
            <Bell style={{ width: '16px', height: '16px' }} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Alerts & Notifications</h3>
                <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">2 New</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-3 p-2 rounded-xl hover:bg-amber-50/50 transition">
                  <AlertTriangle style={{ width: '16px', height: '16px' }} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-slate-800">Bot Cluster Detected</p>
                    <p className="text-[11px] text-slate-500">Ensemble classifier scanned 7,642 accounts</p>
                    <span className="text-[10px] text-slate-400">Just now</span>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-2 rounded-xl hover:bg-amber-50/50 transition">
                  <CheckCircle2 style={{ width: '16px', height: '16px' }} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-slate-800">SHAP Explainability Ready</p>
                    <p className="text-[11px] text-slate-500">TreeExplainer metrics updated</p>
                    <span className="text-[10px] text-slate-400">5m ago</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate('/analyze')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-bold text-xs shadow-md transition whitespace-nowrap"
          style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', boxShadow: '0 4px 12px rgba(245,158,11,0.35)', color: '#0d1b2a' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
        >
          <Sparkles style={{ width: '14px', height: '14px' }} />
          <span className="hidden sm:inline">+ New Analysis</span>
        </button>
      </div>
    </header>
  )
}
