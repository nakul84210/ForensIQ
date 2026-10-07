import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getThreatFeed } from '../services/api'
import {
  Radio,
  Pause,
  Play,
  ShieldAlert,
  ExternalLink,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

// Status badge config — driven by the real "status" field from the backend.
const statusConfig = {
  Fake: {
    label: 'Fake',
    icon: XCircle,
    badge: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60',
    card: 'border-rose-300 dark:border-rose-900/80 shadow-rose-500/5',
    dot: 'bg-rose-500',
    text: 'text-rose-600 dark:text-rose-400',
  },
  Suspicious: {
    label: 'Suspicious',
    icon: AlertCircle,
    badge: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/60',
    card: 'border-amber-300 dark:border-amber-900/80 shadow-amber-500/5',
    dot: 'bg-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
  },
}

const STATUS_FILTERS = ['All', 'Fake', 'Suspicious']

function RiskBar({ score }) {
  const pct = Math.min(100, Math.max(0, score))
  const color =
    pct >= 75 ? 'bg-rose-500' : pct >= 50 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 tabular-nums w-8 text-right">
        {pct}%
      </span>
    </div>
  )
}

function ThreatCard({ item, index }) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const cfg = statusConfig[item.status] || statusConfig.Suspicious
  const StatusIcon = cfg.icon
  const displayTime = item.analyzed_at
    ? new Date(item.analyzed_at).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Unknown'

  return (
    <div
      className={`bg-white dark:bg-slate-900 border rounded-3xl p-5 shadow-sm transition-all duration-300 ${cfg.card}`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          {/* Status icon */}
          <div
            className={`p-2.5 rounded-2xl flex-shrink-0 mt-0.5 border ${cfg.badge}`}
          >
            <StatusIcon className="w-4 h-4" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Username + badges */}
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                {item.username}
              </span>
              {item.isNew && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500 text-white animate-pulse">
                  RECENTLY FLAGGED
                </span>
              )}
              {/* Real status badge — not a made-up category */}
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.badge}`}
              >
                {cfg.label}
              </span>
              {/* Repeat-analysis note — honest context, not a category */}
              {item.analyze_count > 1 && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  analyzed {item.analyze_count}×
                </span>
              )}
            </div>

            {/* Risk score bar */}
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
              Risk Score
            </p>
            <RiskBar score={item.risk_score} />

            {/* Top reason (always visible) */}
            {item.reasons.length > 0 && (
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed mt-2">
                {item.reasons[0]}
              </p>
            )}

            {/* Expandable full reasons list */}
            {item.reasons.length > 1 && (
              <div className="mt-2">
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-500 dark:text-indigo-400 hover:underline"
                >
                  {expanded ? (
                    <>
                      <ChevronUp className="w-3 h-3" />
                      Hide details
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3" />+{item.reasons.length - 1} more reasons
                    </>
                  )}
                </button>
                {expanded && (
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    {item.reasons.slice(1).map((r, i) => (
                      <li
                        key={i}
                        className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed"
                      >
                        {r}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Metadata row */}
            <div className="flex items-center gap-4 text-[11px] text-slate-400 font-semibold mt-3">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {displayTime}
              </span>
              <span>📱 {item.platform}</span>
            </div>
          </div>
        </div>

        {/* Investigate button */}
        <div className="flex-shrink-0 text-right">
          <button
            onClick={() =>
              navigate(`/analyze?q=${item.username.replace('@', '')}`)
            }
            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline mt-1"
          >
            <span>Investigate</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ThreatFeed() {
  const [feeds, setFeeds] = useState([])
  const [filter, setFilter] = useState('All')
  const [paused, setPaused] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchFeed()
  }, [])

  const fetchFeed = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getThreatFeed()
      setFeeds(res.data?.threats || [])
    } catch (err) {
      console.error('Could not fetch threat feed:', err)
      setError('Failed to load threat feed. Check that the backend is running.')
      setFeeds([])
    } finally {
      setLoading(false)
    }
  }

  const filtered =
    filter === 'All' ? feeds : feeds.filter((f) => f.status === filter)

  const fakeCount = feeds.filter((f) => f.status === 'Fake').length
  const suspiciousCount = feeds.filter((f) => f.status === 'Suspicious').length
  const highRiskCount = feeds.filter((f) => f.risk_score >= 75).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Radio className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Threat Intelligence Feed</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Most-recent analysis result per flagged account — deduplicated, real
            data only.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 text-emerald-600 dark:text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Live DB Stream</span>
          </span>

          <button
            onClick={() => !paused && fetchFeed()}
            title="Refresh feed"
            className="p-2 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setPaused(!paused)}
            className={`px-3 py-1.5 rounded-full border text-xs font-bold flex items-center gap-1.5 transition ${
              paused
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/60'
                : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/60'
            }`}
          >
            {paused ? (
              <Play className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Pause className="w-3.5 h-3.5 fill-current" />
            )}
            <span>{paused ? 'Resume' : 'Pause'}</span>
          </button>
        </div>
      </div>

      {/* Stats — derived from real status/risk_score fields */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Unique Flagged Accounts
          </p>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            {feeds.length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Confirmed Fake
          </p>
          <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
            {fakeCount}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Suspicious
          </p>
          <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
            {suspiciousCount}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            High Risk (≥75%)
          </p>
          <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
            {highRiskCount}
          </p>
        </div>
      </div>

      {/* Filter by real status field */}
      <div className="flex gap-2 flex-wrap items-center">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Filter:
        </span>
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              filter === s
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {s}
            {s !== 'All' && (
              <span className="ml-1.5 opacity-70">
                ({s === 'Fake' ? fakeCount : suspiciousCount})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Feed list / states */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading threat feed…</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60">
            <ShieldAlert className="w-8 h-8 text-rose-500" />
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {error}
          </p>
          <button
            onClick={fetchFeed}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="p-5 rounded-3xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <div>
            <p className="text-base font-bold text-slate-700 dark:text-slate-200">
              {filter === 'All'
                ? 'No flagged accounts yet'
                : `No ${filter} accounts in the database`}
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 max-w-sm">
              {filter === 'All'
                ? 'Run a profile analysis to populate this feed. Only real Fake or Suspicious results will appear here.'
                : `Switch to "All" or run more analyses to see ${filter.toLowerCase()} accounts.`}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item, idx) => (
            <ThreatCard key={item.id} item={item} index={idx} />
          ))}
        </div>
      )}
    </div>
  )
}
