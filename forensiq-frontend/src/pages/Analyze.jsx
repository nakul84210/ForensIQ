import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { searchProfile, analyzeProfile, generateNarrative, downloadReportPdf } from '../services/api'
import {
  Search, Bot, UserCheck, AlertTriangle, FileText, Sparkles, Layers,
  MapPin, Calendar, MessageSquare, ThumbsUp, Cpu, BarChart3, CheckCircle2,
  AlertCircle, Download, BrainCircuit, RotateCw, Loader2, ShieldAlert,
  Users, Activity, Clock, Hash,
} from 'lucide-react'

const getRiskStyle = (score) => {
  if (score >= 55) return {
    text: 'text-rose-400', bg: 'bg-rose-950/20', border: 'border-rose-500/30',
    bar: 'bg-rose-500', badge: 'badge-red', icon: AlertCircle,
    gaugeColor: '#ef4444', label: 'HIGH RISK',
  }
  if (score >= 28) return {
    text: 'text-amber-400', bg: 'bg-amber-950/20', border: 'border-amber-500/30',
    bar: 'bg-amber-500', badge: 'badge-amber', icon: AlertTriangle,
    gaugeColor: '#f59e0b', label: 'SUSPICIOUS',
  }
  return {
    text: 'text-emerald-400', bg: 'bg-emerald-950/20', border: 'border-emerald-500/30',
    bar: 'bg-emerald-500', badge: 'badge-green', icon: CheckCircle2,
    gaugeColor: '#10b981', label: 'LIKELY REAL',
  }
}

const formatMarkdownInline = (text) => {
  if (!text) return ''
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={idx} className="font-bold text-slate-900 dark:text-white">{part.slice(2,-2)}</strong>
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={idx} className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-[11px] text-amber-400 font-mono">{part.slice(1,-1)}</code>
    return part
  })
}

const SCAN_STAGES = [
  { id: 'fetch',   label: 'Fetching live profile data',          sub: 'Querying Twitter / X via scraping proxy' },
  { id: 'extract', label: 'Extracting 26 forensic features',     sub: 'Network, activity, content, bio, username, temporal' },
  { id: 'ml',      label: 'Running ensemble ML classifiers',     sub: 'Random Forest · XGBoost · LightGBM (Cresci-2017)' },
  { id: 'shap',    label: 'Computing SHAP explainability',       sub: 'TreeExplainer — top-8 feature attribution' },
  { id: 'blend',   label: 'Blending scores & finalising verdict',sub: 'Adaptive 50/50 or 75/25 weighting strategy' },
]

function ScanAnimation() {
  const [stage, setStage] = useState(0)
  const [dots, setDots] = useState('')
  useEffect(() => {
    const d = setInterval(() => setDots(v => v.length >= 3 ? '' : v + '.'), 400)
    const s = setInterval(() => setStage(v => Math.min(v + 1, SCAN_STAGES.length - 1)), 900)
    return () => { clearInterval(d); clearInterval(s) }
  }, [])
  return (
    <div className="glass-card p-8 fade-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', boxShadow: '0 4px 16px rgba(245,158,11,0.4)' }}>
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white dark:border-slate-900 animate-ping" />
        </div>
        <div>
          <p className="text-base font-bold text-slate-900 dark:text-white">Forensic Scan In Progress{dots}</p>
          <p className="text-xs text-slate-500 dark:text-white/40">ForensIQ Multi-Modal Analysis Engine</p>
        </div>
      </div>
      <div className="space-y-3 mb-6">
        {SCAN_STAGES.map((s, i) => {
          const done = i < stage, active = i === stage
          return (
            <div key={s.id} className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${active ? 'bg-amber-500/10 border border-amber-500/30' : done ? 'opacity-60' : 'opacity-30'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-emerald-500' : active ? 'bg-amber-500 animate-pulse' : 'bg-slate-300 dark:bg-white/10'}`}>
                {done ? <CheckCircle2 className="w-3 h-3 text-white" /> : <div className={`w-2 h-2 rounded-full ${active ? 'bg-white' : 'bg-slate-400 dark:bg-white/30'}`} />}
              </div>
              <div className="min-w-0">
                <p className={`text-xs font-bold truncate ${done ? 'text-emerald-500' : active ? 'text-amber-500' : 'text-slate-400 dark:text-white/30'}`}>{s.label}</p>
                {active && <p className="text-[10px] text-slate-500 dark:text-white/40 truncate mt-0.5">{s.sub}</p>}
              </div>
            </div>
          )
        })}
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] font-bold text-slate-500 dark:text-white/40">
          <span>Analysis Progress</span>
          <span>{Math.round((stage / SCAN_STAGES.length) * 100)}%</span>
        </div>
        <div className="h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${(stage / SCAN_STAGES.length) * 100}%`, background: 'linear-gradient(90deg,#f59e0b,#d97706)' }} />
        </div>
      </div>
    </div>
  )
}

function RiskGauge({ score }) {
  const [display, setDisplay] = useState(0)
  const style = getRiskStyle(score)
  useEffect(() => {
    let start = null
    const animate = (ts) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / 1200, 1)
      setDisplay(Math.round((1 - Math.pow(1 - p, 3)) * score))
      if (p < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [score])
  const r = 54, cx = 70, cy = 70
  const toRad = d => d * Math.PI / 180
  const polar = (deg, radius) => ({ x: cx + radius * Math.cos(toRad(deg)), y: cy + radius * Math.sin(toRad(deg)) })
  const startAngle = -210, sweep = 240
  const arcOf = pct => polar(startAngle + sweep * pct, r)
  const s = arcOf(0), e = arcOf(display / 100), te = arcOf(1)
  const trackD = `M ${s.x} ${s.y} A ${r} ${r} 0 1 1 ${te.x} ${te.y}`
  const scoreD = display > 0 ? `M ${s.x} ${s.y} A ${r} ${r} 0 ${(sweep * display / 100) > 180 ? 1 : 0} 1 ${e.x} ${e.y}` : null
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="140" height="100" viewBox="0 0 140 100">
        <path d={trackD} fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" className="text-slate-200 dark:text-white/5" />
        {scoreD && <path d={scoreD} fill="none" stroke={style.gaugeColor} strokeWidth="8" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 6px ${style.gaugeColor}80)` }} />}
        <text x={cx} y={cy - 4} textAnchor="middle" fill={style.gaugeColor} fontSize="22" fontWeight="800" fontFamily="system-ui">{display}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="currentColor" fontSize="9" fontWeight="600" className="text-slate-400" fontFamily="system-ui">BOT RISK %</text>
      </svg>
      <span className={`text-xs font-black tracking-widest px-3 py-1 rounded-full ${style.badge}`}>{style.label}</span>
    </div>
  )
}

function ProfileCard({ result, riskStyle }) {
  const RiskIcon = riskStyle.icon
  return (
    <div className={`glass-card p-5 ${riskStyle.bg} ${riskStyle.border}`}>
      <div className="flex items-start gap-4">
        <div className="relative flex-shrink-0">
          {result.profile_image
            ? <img src={result.profile_image} alt={result.username} className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20 shadow-lg" />
            : <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${riskStyle.bg} border ${riskStyle.border}`}><RiskIcon className={`w-7 h-7 ${riskStyle.text}`} /></div>}
          <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center ${result.status === 'Fake' ? 'bg-rose-500' : result.status === 'Suspicious' ? 'bg-amber-500' : 'bg-emerald-500'}`}>
            {result.status === 'Fake' ? <Bot className="w-2.5 h-2.5 text-white" /> : result.status === 'Suspicious' ? <AlertTriangle className="w-2.5 h-2.5 text-white" /> : <UserCheck className="w-2.5 h-2.5 text-white" />}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white truncate">
              {result.name && result.name !== result.username ? result.name : `@${result.username}`}
            </h3>
            {result.name && result.name !== result.username && <span className="text-sm font-semibold text-slate-500 dark:text-white/40">@{result.username}</span>}
            {result.verified && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-500 border border-sky-500/30">✓ Verified</span>}
            {result.from_twitter_api && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">⚡ Live</span>}
            {result.data_source === 'preset_profile' && <span className="badge-blue">📋 Preset</span>}
          </div>
          {result.bio && <p className="text-xs text-slate-600 dark:text-white/60 leading-relaxed mb-2 line-clamp-2">{result.bio}</p>}
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-500 dark:text-white/40">
            {result.location && result.location !== 'Unknown' && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{result.location}</span>}
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{result.account_age_days}d old</span>
            <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{(result.posts||0).toLocaleString()} posts</span>
          </div>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/5 grid grid-cols-3 gap-3 text-center">
        {[{ label: 'Followers', value: result.followers }, { label: 'Following', value: result.following }, { label: 'Posts', value: result.posts }].map(({ label, value }) => (
          <div key={label}>
            <p className="text-sm font-extrabold text-slate-900 dark:text-white">{(value||0).toLocaleString()}</p>
            <p className="text-[10px] font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wide">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function RadarChart({ result }) {
  const f = result.features || {}
  const clamp = (v, min, max) => Math.min(Math.max((v - min) / (max - min) * 100, 0), 100)
  const axes = [
    { label: 'Network',  color: '#f59e0b', score: 100 - clamp(f.follower_ratio ?? 0.5, 0, 2) * 100 },
    { label: 'Activity', color: '#ef4444', score: clamp(f.posts_per_day ?? 0, 0, 60) },
    { label: 'Content',  color: '#8b5cf6', score: clamp((f.avg_hashtags ?? 0) * 10 + (f.url_density ?? 0) * 50, 0, 100) },
    { label: 'Bio',      color: '#06b6d4', score: f.bio_length === 0 ? 80 : clamp((f.bio_spam_score ?? 0) * 100, 0, 100) },
    { label: 'Username', color: '#10b981', score: clamp((f.username_digit_ratio ?? 0) * 100 + (1 - (f.username_entropy ?? 0.5)) * 30, 0, 100) },
    { label: 'Temporal', color: '#f43f5e', score: clamp((f.posting_hour_entropy ?? 0.5) * 100, 0, 100) },
  ]
  const N = axes.length, cx = 110, cy = 110, R = 75
  const toRad = d => d * Math.PI / 180
  const angleOf = i => (i / N) * 2 * Math.PI - Math.PI / 2
  const polar = (a, r) => ({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) })
  const levelPoly = l => axes.map((_, i) => { const p = polar(angleOf(i), R * l); return `${p.x},${p.y}` }).join(' ')
  const dataPoly = axes.map((ax, i) => { const p = polar(angleOf(i), R * (ax.score / 100)); return `${p.x},${p.y}` }).join(' ')
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Layers className="w-4 h-4 text-amber-500" />
        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Feature Group Signal Radar</h4>
        <span className="ml-auto text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20">Live</span>
      </div>
      <p className="text-[11px] text-slate-500 dark:text-white/40 mb-3">Each axis = bot-signal intensity (0–100%). Higher = more suspicious.</p>
      <div className="flex justify-center">
        <svg width="220" height="220" viewBox="0 0 220 220">
          {[0.2,0.4,0.6,0.8,1.0].map((l, li) => <polygon key={li} points={levelPoly(l)} fill="none" stroke="currentColor" strokeWidth="0.5" className="text-slate-200 dark:text-white/10" />)}
          {axes.map((_, i) => { const p = polar(angleOf(i), R); return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="currentColor" strokeWidth="0.5" className="text-slate-200 dark:text-white/10" /> })}
          <polygon points={dataPoly} fill="#f59e0b" fillOpacity="0.15" stroke="#f59e0b" strokeWidth="1.5" />
          {axes.map((ax, i) => { const p = polar(angleOf(i), R * (ax.score / 100)); return <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={ax.color} style={{ filter: `drop-shadow(0 0 4px ${ax.color})` }} /> })}
          {axes.map((ax, i) => { const lp = polar(angleOf(i), R + 18); return (
            <g key={i}>
              <text x={lp.x} y={lp.y + 4} textAnchor="middle" fontSize="8.5" fontWeight="700" fill={ax.color} fontFamily="system-ui">{ax.label}</text>
              <text x={lp.x} y={lp.y + 13} textAnchor="middle" fontSize="7" fontWeight="600" fill="#94a3b8" fontFamily="system-ui">{Math.round(ax.score)}%</text>
            </g>
          )})}
        </svg>
      </div>
    </div>
  )
}

function AnimatedSHAPBar({ item, idx, delay }) {
  const [width, setWidth] = useState(0)
  const [shown, setShown] = useState(false)
  const val = item.value ?? item[1]
  const feature = item.feature ?? item[0]
  const numVal = Number(val)
  const isPositive = (item.signal === 'Bot Signal') || numVal > 0
  const targetWidth = Math.min(Math.round(Math.abs(numVal) * 250), 100)
  const dispName = typeof feature === 'string' ? feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : feature
  useEffect(() => {
    const t = setTimeout(() => { setShown(true); setTimeout(() => setWidth(targetWidth), 50) }, delay)
    return () => clearTimeout(t)
  }, [delay, targetWidth])
  if (!shown) return <div className="h-9 rounded-xl bg-slate-100 dark:bg-white/5 animate-pulse" />
  return (
    <div className="space-y-1 fade-up">
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className="text-slate-900 dark:text-white/80">{dispName}</span>
        <span className={`font-mono font-bold text-[11px] ${isPositive ? 'text-rose-400' : 'text-emerald-400'}`}>
          {numVal > 0 ? `+${numVal.toFixed(4)}` : numVal.toFixed(4)} {item.signal ? `(${item.signal})` : isPositive ? '(Bot Signal)' : '(Real Signal)'}
        </span>
      </div>
      <div className="w-full h-2.5 bg-slate-100 dark:bg-black/40 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ease-out ${isPositive ? 'bg-rose-500' : 'bg-emerald-500'}`}
          style={{ width: `${width}%`, boxShadow: isPositive ? '0 0 6px rgba(239,68,68,0.4)' : '0 0 6px rgba(16,185,129,0.4)' }} />
      </div>
    </div>
  )
}

export default function Analyze() {
  const [searchParams] = useSearchParams()
  const queryParam = searchParams.get('q') || ''
  const [username, setUsername] = useState(queryParam)
  const [platform] = useState('Twitter')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [narrative, setNarrative] = useState('')
  const [narrativeLoading, setNarrativeLoading] = useState(false)
  const [narrativeError, setNarrativeError] = useState('')
  const [pdfDownloading, setPdfDownloading] = useState(false)
  const [pdfError, setPdfError] = useState('')

  useEffect(() => {
    if (queryParam) { setUsername(queryParam); performSearch(queryParam, platform) }
  }, [queryParam])

  const performSearch = async (targetUsername, targetPlatform) => {
    if (!targetUsername.trim()) return
    setLoading(true); setError(''); setResult(null); setNarrative(''); setNarrativeError(''); setPdfError('')
    const clean = targetUsername.replace('@', '').trim()
    try {
      const searchRes = await searchProfile(clean)
      if (searchRes.data.found) {
        const p = searchRes.data.profile
        const res = await analyzeProfile({ username: clean, platform: p.platform || targetPlatform, followers: p.followers ?? 0, following: p.following ?? 0, posts: p.posts ?? 0, bio: p.bio || '', account_age_days: p.account_age_days ?? 0, avg_hashtags: p.avg_hashtags ?? 0, likes_per_post: p.likes_per_post ?? 0, posts_per_day: p.posts_per_day ?? 0, verified: p.verified ?? false })
        setResult({ ...res.data, name: p.name || res.data.name || clean, bio: p.bio || '', recent_posts: p.recent_posts || [], location: p.location || '', profile_image: p.profile_image || '', data_source: p.dataset_source || res.data.data_source || 'live_twitter' })
        setNarrative(res.data.narrative || '')
      } else {
        setError(searchRes.data.error || `Profile @${clean} could not be found.`)
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.error || 'Network Error: Unable to connect to backend server')
    }
    setLoading(false)
  }

  const handleSearch = (e) => { e.preventDefault(); performSearch(username, platform) }

  const handleGenerateNarrative = async (regenerate = false) => {
    if (!result) return
    const targetId = result.id || result.analysis_id || result.username
    setNarrativeLoading(true); setNarrativeError('')
    try {
      const res = await generateNarrative(targetId, regenerate)
      if (res.data?.narrative) { setNarrative(res.data.narrative); setResult(prev => prev ? { ...prev, narrative: res.data.narrative } : prev) }
      else setNarrativeError(res.data?.error || 'Failed to generate narrative.')
    } catch (err) {
      setNarrativeError(err.response?.data?.detail || err.response?.data?.error || err.message || 'Failed to generate forensic narrative.')
    } finally { setNarrativeLoading(false) }
  }

  const handleDownloadPdf = async () => {
    if (!result) return
    setPdfDownloading(true); setPdfError('')
    try { await downloadReportPdf(result.id || result.analysis_id || result.username, `ForensIQ_Dossier_${result.username.replace(/[^a-zA-Z0-9_-]/g,'_')}.pdf`) }
    catch (err) { setPdfError(err.response?.data?.detail || 'Failed to generate PDF dossier.') }
    finally { setPdfDownloading(false) }
  }

  const riskStyle = result ? getRiskStyle(result.risk_score) : null

  return (
    <div className="space-y-6 fade-up">
      <div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-3">
          <span className="text-slate-500 font-semibold">ForensIQ</span>
          <span className="text-slate-300">/</span>
          <span style={{ color: '#d97706' }} className="font-semibold">Profile Risk Analysis</span>
        </div>
        <div className="page-header">
          <h1>Profile Risk Analysis</h1>
        </div>
      </div>

      {/* Search */}
      <div className="glass-card">
        <div className="px-6 py-5" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', boxShadow: '0 2px 8px rgba(245,158,11,0.3)' }}>
              <ShieldAlert className="w-4 h-4" style={{ color: '#0d1b2a' }} />
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <p className="text-sm font-semibold text-slate-900">Profile Risk Analyzer</p>
              <span style={{ display:'inline-flex',alignItems:'center',gap:'5px',padding:'3px 10px',borderRadius:'9999px',background:'#000',color:'#fff',fontSize:'11px',fontWeight:700 }}>
                <svg viewBox="0 0 24 24" style={{ width:'11px',height:'11px',fill:'#fff' }}><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                Twitter / X
              </span>
            </div>
          </div>
        </div>
        <div className="px-6 py-6">
          <form onSubmit={handleSearch}>
            <div className="mb-4">
              <label htmlFor="username-input" className="block mb-1.5" style={{ fontWeight:600,fontSize:'12px',color:'#475569' }}>Username / Profile</label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ width:'15px',height:'15px',color:'#94a3b8' }} />
                <input id="username-input" type="text" value={username} onChange={e => { setUsername(e.target.value); setError('') }} placeholder="Enter username (e.g. elonmusk)" className="fiq-input pl-11" />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" id="run-forensic-scan-btn" disabled={loading || !username.trim()} className="btn-gold">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{loading ? 'Evaluating...' : 'Run Forensic Scan'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 fade-up" style={{ background:'#fff5f5',border:'1px solid #fecaca',borderRadius:'12px',color:'#dc2626',fontSize:'13px',fontWeight:600 }}>
          <AlertCircle style={{ width:'16px',height:'16px',flexShrink:0 }} /><span>{error}</span>
        </div>
      )}

      {loading && <ScanAnimation />}

      {result && !loading && (
        <div className="space-y-5 fade-up">
          {/* Profile card + gauge */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2"><ProfileCard result={result} riskStyle={riskStyle} /></div>
            <div className="glass-card p-5 flex flex-col items-center justify-between gap-4">
              <RiskGauge score={result.risk_score} />
              <p className="text-[10px] text-center text-slate-500 dark:text-white/40 leading-relaxed px-2">
                {result.blend_description || (result.engagement_data_available === false ? '75% rule-based · 25% ML (XGB+LGB)' : '50% rule-based · 50% ML ensemble')}
              </p>
              <div className="flex flex-col gap-2 w-full">
                <button type="button" onClick={() => handleGenerateNarrative(Boolean(narrative))} disabled={narrativeLoading} className="btn-gold w-full justify-center text-xs">
                  {narrativeLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : narrative ? <RotateCw className="w-3.5 h-3.5" /> : <BrainCircuit className="w-3.5 h-3.5" />}
                  <span>{narrativeLoading ? 'Synthesizing...' : narrative ? 'Regenerate Narrative' : 'Generate AI Narrative'}</span>
                </button>
                <button type="button" onClick={handleDownloadPdf} disabled={pdfDownloading} className="btn-ghost w-full justify-center text-xs">
                  {pdfDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" /> : <Download className="w-3.5 h-3.5" />}
                  <span>{pdfDownloading ? 'Compiling...' : 'Download PDF Dossier'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Detection flags */}
          {result.reasons && result.reasons.length > 0 && (
            <div className={`glass-card p-5 ${riskStyle.bg} ${riskStyle.border}`}>
              <p className="text-[11px] font-bold text-slate-900 dark:text-white/40 uppercase tracking-wider mb-3">⚠ Detection Flags ({result.reasons.length})</p>
              <div className="flex flex-wrap gap-2">
                {result.reasons.map((r, i) => <span key={i} className="px-3 py-1.5 rounded-xl bg-white/60 dark:bg-white/5 text-slate-800 dark:text-white/70 text-xs font-semibold border border-slate-200 dark:border-white/10 shadow-sm">{r}</span>)}
              </div>
            </div>
          )}

          {/* Radar + Model scores */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <RadarChart result={result} />
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-3"><Cpu className="w-4 h-4 text-amber-500" /><h4 className="text-sm font-bold text-slate-900 dark:text-white">Ensemble Model Scores</h4></div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Heuristic Rules', score: result.model_scores?.rule_based ?? result.heuristic_score, color: '#f59e0b' },
                  { label: 'Random Forest',   score: result.model_scores?.random_forest ?? result.rf_score, excluded: result.engagement_data_available === false && (result.model_scores?.random_forest ?? result.rf_score) == null, color: '#8b5cf6' },
                  { label: 'XGBoost',         score: result.model_scores?.xgboost ?? result.xgb_score, color: '#06b6d4' },
                  { label: 'LightGBM',        score: result.model_scores?.lightgbm ?? result.lgbm_score, color: '#10b981' },
                ].map(m => {
                  const n = m.score != null ? Number(m.score) : null
                  const s = n != null ? getRiskStyle(n) : null
                  return (
                    <div key={m.label} className="p-3.5 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                      <p className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-wider mb-1">{m.label}</p>
                      {m.excluded ? <p className="text-xs font-semibold text-slate-400">Excluded<br/><span className="text-[9px] opacity-70">no engagement data</span></p>
                        : <p className={`text-2xl font-extrabold ${s ? s.text : 'text-slate-300'}`}>{n != null ? `${n}%` : 'N/A'}</p>}
                      <div className="w-full h-1.5 bg-slate-200 dark:bg-black/40 rounded-full mt-2 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${n||0}%`, background: m.color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* SHAP — animated */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-amber-500" /><h4 className="text-base font-bold text-slate-900 dark:text-white">SHAP Feature Explainability (XAI)</h4></div>
              {(result.shap_explanation?.length > 0 || result.shap_values) && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20">TreeExplainer</span>}
            </div>
            <p className="text-xs text-slate-500 dark:text-white/40 mb-5">Signed per-feature contribution — red pushes toward Bot (+), green signals Authentic Human (-).</p>
            {result.shap_explanation && result.shap_explanation.length > 0 ? (
              <div className="space-y-3">{result.shap_explanation.map((item, idx) => <AnimatedSHAPBar key={idx} item={item} idx={idx} delay={idx * 120} />)}</div>
            ) : result.shap_values ? (
              <div className="space-y-3">
                {Object.entries(result.shap_values).filter(([_,v]) => v != null && !Number.isNaN(Number(v))).sort((a,b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0,8).map(([key,val],idx) => (
                  <AnimatedSHAPBar key={key} item={{ feature: key, value: val, signal: Number(val) > 0 ? 'Bot Signal' : 'Real Signal' }} idx={idx} delay={idx * 120} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(result.features || {}).filter(([k]) => !k.startsWith('_')).map(([key, value]) => {
                  const missing = value === null || value === undefined || (typeof value === 'number' && Number.isNaN(value))
                  return (
                    <div key={key} className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-100 dark:bg-white/5 text-xs font-semibold">
                      <span className="text-slate-600 dark:text-white/50 capitalize">{key.replace(/_/g,' ')}</span>
                      <span className={`font-mono ${missing ? 'text-slate-400 italic font-normal' : 'text-slate-900 dark:text-white font-bold'}`}>
                        {missing ? 'N/A' : typeof value === 'boolean' ? (value ? 'TRUE' : 'FALSE') : typeof value === 'number' ? Math.round(value*100)/100 : value}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* AI Narrative */}
          <div className="glass-card p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20"><BrainCircuit className="w-5 h-5" /></div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">AI Forensic Intelligence Narrative</h4>
                  <p className="text-xs text-slate-500 dark:text-white/40">Evidence-grounded synthesis — Groq API (Llama/Qwen)</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/40 border border-slate-200 dark:border-white/10">Groq Engine</span>
                {narrative && <button type="button" onClick={() => handleGenerateNarrative(true)} disabled={narrativeLoading} className="text-xs font-semibold px-2.5 py-1 rounded-lg text-slate-500 dark:text-white/40 hover:text-amber-500 border border-slate-200 dark:border-white/10 transition flex items-center gap-1"><RotateCw className={`w-3.5 h-3.5 ${narrativeLoading ? 'animate-spin' : ''}`} />Refresh</button>}
              </div>
            </div>
            {narrativeLoading ? (
              <div className="py-10 text-center space-y-4">
                <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 text-amber-500 animate-pulse"><Loader2 className="w-6 h-6 animate-spin" /></div>
                <div><p className="text-sm font-bold text-slate-900 dark:text-white">Synthesizing Forensic Report...</p><p className="text-xs text-slate-500 dark:text-white/40 max-w-md mx-auto mt-1">Evaluating SHAP distributions, ML ensemble outputs, and data constraints.</p></div>
              </div>
            ) : narrativeError ? (
              <div className="mt-4 p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 space-y-3">
                <div className="flex items-start gap-3 text-rose-400"><AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /><div><p className="text-xs font-bold">Narrative Generation Failed</p><p className="text-xs opacity-90 mt-0.5">{narrativeError}</p></div></div>
                <button type="button" onClick={() => handleGenerateNarrative(false)} className="text-xs font-bold px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 transition flex items-center gap-1.5"><RotateCw className="w-3.5 h-3.5" /><span>Retry</span></button>
              </div>
            ) : narrative ? (
              <div className="mt-5 space-y-4 text-xs sm:text-sm text-slate-800 dark:text-white/80 leading-relaxed">
                {narrative.split('\n\n').map((block, i) => {
                  const t = block.trim()
                  if (!t) return null
                  if (t.startsWith('> ')) return <div key={i} className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-medium"><span>{formatMarkdownInline(t.replace(/^>\s*/,''))}</span></div>
                  if (t.startsWith('### ')) return <div key={i} className="pt-3 pb-1 border-b border-slate-200 dark:border-white/5"><h5 className="text-xs font-bold text-amber-500 uppercase tracking-wider">{t.replace('### ','').replace(/\*\*/g,'')}</h5></div>
                  if (t.includes('\n- ') || t.startsWith('- ')) return <ul key={i} className="space-y-1.5 pl-2">{t.split(/\n[-*]\s+/).filter(Boolean).map((b,bi) => <li key={bi} className="flex items-start gap-2"><span className="text-amber-500 mt-1">•</span><span>{formatMarkdownInline(b.replace(/^[-*]\s+/,''))}</span></li>)}</ul>
                  return <p key={i}>{formatMarkdownInline(t)}</p>
                })}
              </div>
            ) : (
              <div className="mt-6 py-6 px-4 rounded-2xl bg-slate-100 dark:bg-white/5 border border-dashed border-slate-300 dark:border-white/10 text-center space-y-3">
                <p className="text-xs text-slate-500 dark:text-white/40 max-w-lg mx-auto">Synthesize the profile metadata, ensemble ML predictions, and SHAP explainability into an evidence-grounded intelligence briefing.</p>
                <button type="button" onClick={() => handleGenerateNarrative(false)} className="btn-gold"><BrainCircuit className="w-4 h-4" /><span>Generate Forensic Narrative</span></button>
              </div>
            )}
          </div>

          {/* Recent Posts */}
          {result.recent_posts && result.recent_posts.length > 0 && (
            <div className="glass-card p-6">
              <h4 className="text-base font-bold text-slate-900 dark:text-white mb-4">Extracted Recent Posts</h4>
              <div className="space-y-3">
                {result.recent_posts.map((post, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                    <p className="text-xs sm:text-sm text-slate-800 dark:text-white/80 leading-relaxed font-medium">{post.content}</p>
                    <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-white/40 font-semibold">
                      <span className="flex items-center gap-1"><ThumbsUp className="w-3.5 h-3.5 text-amber-500" />{post.likes} likes</span><span>•</span><span>{post.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {pdfError && <div className="flex items-center gap-2 text-xs text-rose-500 font-semibold"><AlertCircle className="w-4 h-4" /><span>{pdfError}</span></div>}
        </div>
      )}

      {/* Idle state */}
      {!result && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3 glass-card" style={{ overflow:'hidden' }}>
            <div style={{ padding:'13px 20px',borderBottom:'1px solid #f1f5f9' }}><p style={{ fontSize:'11px',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.07em',margin:0 }}>How It Works</p></div>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(3, 1fr)' }}>
              {[
                { icon: Bot,          color: '#f59e0b', title: 'Ensemble ML',       desc: 'RF · XGB · LGB trained on Cresci-2017 (7,642 profiles, 99.4% accuracy)' },
                { icon: BarChart3,    color: '#8b5cf6', title: 'SHAP + Radar XAI',  desc: 'TreeExplainer + feature group radar chart shows exact signal composition' },
                { icon: BrainCircuit, color: '#06b6d4', title: 'AI Narrative',       desc: 'Groq API synthesizes an evidence-grounded forensic intel brief in real time' },
              ].map(({ icon: Icon, color, title, desc }, i) => (
                <div key={i} style={{ padding:'18px 20px',borderRight:i<2?'1px solid #f1f5f9':'none' }}>
                  <div style={{ width:'32px',height:'32px',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',background:`${color}18`,marginBottom:'10px' }}><Icon style={{ width:'15px',height:'15px',color }} /></div>
                  <p style={{ fontSize:'12px',fontWeight:700,color:'#1e293b',marginBottom:'4px' }}>{title}</p>
                  <p style={{ fontSize:'11.5px',color:'#64748b',lineHeight:'1.5',margin:0 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-2 glass-card" style={{ overflow:'hidden' }}>
            <div style={{ padding:'13px 20px',borderBottom:'1px solid #f1f5f9' }}><p style={{ fontSize:'11px',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.07em',margin:0 }}>Detection Signals</p></div>
            <div style={{ padding:'16px 20px',display:'flex',flexDirection:'column',gap:'10px' }}>
              {[{ label:'Follower / Following Ratio',pct:88,color:'#f59e0b'},{ label:'Account Age & Activity',pct:75,color:'#8b5cf6'},{ label:'Post Frequency & Patterns',pct:70,color:'#06b6d4'},{ label:'Bio & Hashtag Analysis',pct:62,color:'#10b981'},{ label:'Engagement Rate',pct:55,color:'#f43f5e'}].map(({ label, pct, color }) => (
                <div key={label}>
                  <div style={{ display:'flex',justifyContent:'space-between',marginBottom:'5px' }}><span style={{ fontSize:'12px',fontWeight:500,color:'#475569' }}>{label}</span><span style={{ fontSize:'11px',fontWeight:700,color }}>{pct}%</span></div>
                  <div style={{ height:'5px',background:'#f1f5f9',borderRadius:'9999px',overflow:'hidden' }}><div style={{ height:'100%',width:`${pct}%`,background:color,borderRadius:'9999px',transition:'width 0.6s ease' }} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
