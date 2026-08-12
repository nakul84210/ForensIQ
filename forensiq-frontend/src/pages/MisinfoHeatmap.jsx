import { useState } from 'react'
import {
  MapPin,
  Globe,
  Flame,
  Radio,
  Filter,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Sparkles
} from 'lucide-react'

const regions = [
  { id: 'usa', name: 'United States', x: 18, y: 32, intensity: 94, cases: 12847, trending: 'Election Integrity Claims', platform: 'Twitter', change: '+23%' },
  { id: 'brazil', name: 'Brazil', x: 28, y: 58, intensity: 87, cases: 8934, trending: 'Health Misinformation', platform: 'Instagram', change: '+18%' },
  { id: 'uk', name: 'United Kingdom', x: 44, y: 22, intensity: 72, cases: 5621, trending: 'Immigration Myths', platform: 'Twitter', change: '+9%' },
  { id: 'india', name: 'India', x: 66, y: 38, intensity: 91, cases: 15234, trending: 'Communal Misinformation', platform: 'WhatsApp', change: '+31%' },
  { id: 'russia', name: 'Russia', x: 62, y: 18, intensity: 88, cases: 9871, trending: 'Geopolitical Propaganda', platform: 'Telegram', change: '+15%' },
  { id: 'nigeria', name: 'Nigeria', x: 48, y: 48, intensity: 76, cases: 6234, trending: 'Financial Crypto Scams', platform: 'Facebook', change: '+12%' },
  { id: 'china', name: 'China', x: 74, y: 30, intensity: 83, cases: 11234, trending: 'Economic Narratives', platform: 'Weibo', change: '+7%' },
  { id: 'germany', name: 'Germany', x: 50, y: 20, intensity: 61, cases: 3821, trending: 'Vaccine Skepticism', platform: 'Twitter', change: '+5%' },
  { id: 'mexico', name: 'Mexico', x: 18, y: 40, intensity: 69, cases: 4521, trending: 'Crime Statistics', platform: 'Facebook', change: '+11%' },
  { id: 'indonesia', name: 'Indonesia', x: 76, y: 52, intensity: 78, cases: 7123, trending: 'Religious Narratives', platform: 'Instagram', change: '+19%' },
  { id: 'pakistan', name: 'Pakistan', x: 64, y: 36, intensity: 82, cases: 8234, trending: 'Political Polarization', platform: 'Twitter', change: '+22%' },
  { id: 'philippines', name: 'Philippines', x: 78, y: 42, intensity: 74, cases: 5891, trending: 'Electoral Disinformation', platform: 'Facebook', change: '+16%' },
]

const categories = [
  { label: 'Election & Political Propaganda', color: 'bg-rose-500', count: 34821 },
  { label: 'Health & Medical Misinformation', color: 'bg-amber-500', count: 28934 },
  { label: 'Financial & Crypto Giveaways', color: 'bg-yellow-500', count: 19234 },
  { label: 'Religious & Communal Claims', color: 'bg-purple-500', count: 15123 },
  { label: 'Conflict & War Propaganda', color: 'bg-pink-500', count: 12891 },
]

const intensityColor = (intensity) => {
  if (intensity >= 90) return '#ef4444'
  if (intensity >= 75) return '#f97316'
  if (intensity >= 60) return '#eab308'
  return '#10b981'
}

export default function MisinfoHeatmap() {
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('All')
  const [hoveredId, setHoveredId] = useState(null)

  const filtered = regions.filter((r) => {
    if (filter === 'All') return true
    if (filter === 'Critical') return r.intensity >= 90
    if (filter === 'High') return r.intensity >= 75 && r.intensity < 90
    if (filter === 'Medium') return r.intensity >= 60 && r.intensity < 75
    return true
  })

  const totalCases = regions.reduce((sum, r) => sum + r.cases, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Globe className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Global Misinformation Spatial Heatmap</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time geospatial tracking of viral fake news campaigns, misinformation spikes, and foreign propaganda.
          </p>
        </div>

        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 text-emerald-600 dark:text-emerald-400 text-xs font-bold self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>Live Geo Telemetry</span>
        </span>
      </div>

      {/* Summary Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Indexed Incidents</p>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{totalCases.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Affected Countries</p>
          <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">{regions.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Critical Outbreak Zones</p>
          <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
            {regions.filter((r) => r.intensity >= 90).length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Global Severity Index</p>
          <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
            {Math.round(regions.reduce((s, r) => s + r.intensity, 0) / regions.length)}%
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {['All', 'Critical', 'High', 'Medium'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filter === f
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            {f} Severity
          </button>
        ))}
      </div>

      {/* Map Canvas Box */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-sm overflow-hidden">
        <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200/60 dark:border-slate-800" style={{ paddingBottom: '50%' }}>
          <svg viewBox="0 0 100 50" className="absolute inset-0 w-full h-full bg-slate-900">
            <defs>
              <radialGradient id="globe-grad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#1e1b4b" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#0f172a" stopOpacity="1" />
              </radialGradient>
            </defs>

            <rect width="100" height="50" fill="url(#globe-grad)" />

            {/* Grid Lines */}
            <line x1="0" y1="25" x2="100" y2="25" stroke="#334155" strokeWidth="0.1" />
            {[10, 25, 40, 60, 75, 90].map((x) => (
              <line key={x} x1={x} y1="0" x2={x} y2="50" stroke="#334155" strokeWidth="0.08" />
            ))}

            {/* Interactive Nodes */}
            {filtered.map((region) => {
              const color = intensityColor(region.intensity)
              const isSelected = selected && selected.id === region.id
              const isHovered = hoveredId === region.id

              return (
                <g
                  key={region.id}
                  onClick={() => setSelected(selected?.id === region.id ? null : region)}
                  onMouseEnter={() => setHoveredId(region.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className="cursor-pointer"
                >
                  {/* Ping Ring */}
                  <circle cx={region.x} cy={region.y} r="3" fill={color} opacity="0.3" className="animate-ping" />

                  {/* Node Circle */}
                  <circle
                    cx={region.x}
                    cy={region.y}
                    r={isSelected || isHovered ? 2.5 : 1.8}
                    fill={color}
                    stroke="#ffffff"
                    strokeWidth="0.3"
                  />

                  {(isHovered || isSelected) && (
                    <text
                      x={region.x}
                      y={region.y - 3}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="1.6"
                      fontWeight="bold"
                    >
                      {region.name} ({region.intensity}%)
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
        </div>
      </div>

      {/* Selected Region Drawer */}
      {selected && (
        <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 rounded-3xl p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>{selected.name} Misinformation Profile</span>
            </h3>

            <button
              onClick={() => setSelected(null)}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Intensity</p>
              <p className="text-xl font-extrabold text-rose-600 dark:text-rose-400">{selected.intensity}%</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Total Incidents</p>
              <p className="text-xl font-extrabold text-slate-900 dark:text-white">{selected.cases.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Primary Platform</p>
              <p className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">{selected.platform}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Weekly Velocity</p>
              <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400">{selected.change}</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 font-semibold text-xs text-slate-700 dark:text-slate-300">
            <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Trending Misinformation Narrative:</span>
            "{selected.trending}"
          </div>
        </div>
      )}

      {/* Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top Outbreak Regions */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <h4 className="text-base font-bold text-slate-900 dark:text-white mb-4">Top Misinformation Outbreak Regions</h4>
          <div className="space-y-3">
            {[...regions].sort((a, b) => b.intensity - a.intensity).slice(0, 5).map((r, i) => (
              <div
                key={r.id}
                onClick={() => setSelected(r)}
                className="p-3 rounded-2xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:border-indigo-500/50 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-xs text-slate-400 w-4">{i + 1}</span>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{r.name}</p>
                    <p className="text-[11px] text-slate-400">{r.trending}</p>
                  </div>
                </div>

                <span className="text-xs font-extrabold text-rose-600 dark:text-rose-400">{r.intensity}% Severity</span>
              </div>
            ))}
          </div>
        </div>

        {/* Categories Distribution */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <h4 className="text-base font-bold text-slate-900 dark:text-white mb-4">Narrative Category Breakdown</h4>
          <div className="space-y-4">
            {categories.map((cat) => (
              <div key={cat.label}>
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  <span>{cat.label}</span>
                  <span>{cat.count.toLocaleString()} cases</span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${cat.color}`} style={{ width: `${(cat.count / categories[0].count) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
