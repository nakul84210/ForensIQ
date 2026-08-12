import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Radio,
  Pause,
  Play,
  ShieldAlert,
  Bot,
  AlertTriangle,
  ExternalLink,
  Clock,
  MapPin,
  Filter,
  Sparkles
} from 'lucide-react'

const initialFeeds = [
  { id: 1, username: '@bot_army_x1', platform: 'Twitter', risk: 97, type: 'Bot Network', time: '2s ago', location: 'Russia', description: 'Coordinated mass retweet campaign detected across 47 accounts', isNew: true },
  { id: 2, username: '@fake_news_blast', platform: 'Instagram', risk: 91, type: 'Misinformation', time: '18s ago', location: 'Unknown', description: 'Spreading manipulated election content to 12k followers', isNew: true },
  { id: 3, username: '@crypto_scam_44', platform: 'Twitter', risk: 88, type: 'Scam Account', time: '45s ago', location: 'Nigeria', description: 'Fake giveaway posts targeting vulnerable users', isNew: false },
  { id: 4, username: '@deepfake_spreader', platform: 'Twitter', risk: 95, type: 'Deepfake', time: '1m ago', location: 'China', description: 'AI-generated profile photo detected, coordinated with 8 other accounts', isNew: false },
  { id: 5, username: '@hate_speech_bot', platform: 'Instagram', risk: 93, type: 'Hate Speech', time: '2m ago', location: 'Unknown', description: 'Automated hate speech targeting minority communities', isNew: false },
  { id: 6, username: '@stock_pump_bot', platform: 'Twitter', risk: 86, type: 'Financial Fraud', time: '3m ago', location: 'USA', description: 'Pump and dump scheme detected, 200+ coordinated posts', isNew: false },
  { id: 7, username: '@phishing_master', platform: 'Instagram', risk: 94, type: 'Phishing', time: '5m ago', location: 'Romania', description: 'Sending malicious links via DMs to 3000+ users', isNew: false },
  { id: 8, username: '@disinfo_agent_7', platform: 'Twitter', risk: 89, type: 'Misinformation', time: '7m ago', location: 'Unknown', description: 'Health misinformation spreading rapidly across network', isNew: false },
]

const incomingThreats = [
  { id: 9, username: '@spam_wave_99', platform: 'Twitter', risk: 92, type: 'Bot Network', time: 'Just now', location: 'Brazil', description: 'New bot cluster detected, 23 accounts posting in sync', isNew: true },
  { id: 10, username: '@fake_celeb_01', platform: 'Instagram', risk: 87, type: 'Scam Account', time: 'Just now', location: 'India', description: 'Impersonating celebrity to run fake merchandise scam', isNew: true },
  { id: 11, username: '@misinfo_rapid', platform: 'Twitter', risk: 90, type: 'Misinformation', time: 'Just now', location: 'Unknown', description: 'Viral false story about natural disaster spreading fast', isNew: true },
]

const typeColors = {
  'Bot Network': 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60',
  'Misinformation': 'bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-900/60',
  'Scam Account': 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/60',
  'Deepfake': 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/60',
  'Hate Speech': 'bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-900/60',
  'Financial Fraud': 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/60',
  'Phishing': 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60',
}

const types = ['All', 'Bot Network', 'Misinformation', 'Scam Account', 'Deepfake', 'Phishing']

export default function ThreatFeed() {
  const [feeds, setFeeds] = useState(initialFeeds)
  const [filter, setFilter] = useState('All')
  const [paused, setPaused] = useState(false)
  const [total, setTotal] = useState(8)
  const navigate = useNavigate()

  useEffect(() => {
    if (paused) return
    let index = 0
    const interval = setInterval(() => {
      if (index < incomingThreats.length) {
        const threat = incomingThreats[index]
        setFeeds((prev) => [threat, ...prev.slice(0, 10)])
        setTotal((prev) => prev + 1)
        index++
      }
    }, 4000)
    return () => clearInterval(interval)
  }, [paused])

  const filtered = filter === 'All' ? feeds : feeds.filter((f) => f.type === filter)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Radio className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Threat Intelligence Live Stream</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time feed of malicious bot clusters, automated spam surges, and deepfake campaigns.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Live Monitoring</span>
          </span>

          <button
            onClick={() => setPaused(!paused)}
            className={`px-3 py-1.5 rounded-full border text-xs font-bold flex items-center gap-1.5 transition ${
              paused
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/60'
                : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/60'
            }`}
          >
            {paused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
            <span>{paused ? 'Resume Stream' : 'Pause Stream'}</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Stream Threats</p>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{total}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Bot Networks</p>
          <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
            {feeds.filter((f) => f.type === 'Bot Network').length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Misinformation Surge</p>
          <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
            {feeds.filter((f) => f.type === 'Misinformation').length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Financial Scams</p>
          <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
            {feeds.filter((f) => f.type === 'Scam Account').length}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              filter === t
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Live Feed Event List */}
      <div className="space-y-3">
        {filtered.map((item) => (
          <div
            key={item.id}
            className={`bg-white dark:bg-slate-900 border rounded-3xl p-5 shadow-sm transition-all duration-300 ${
              item.isNew
                ? 'border-rose-300 dark:border-rose-900/80 shadow-md shadow-rose-500/5'
                : 'border-slate-200/80 dark:border-slate-800'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5">
                  <Bot className="w-5 h-5" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{item.username}</span>
                    {item.isNew && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500 text-white animate-pulse">
                        NEW DETECTED
                      </span>
                    )}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${typeColors[item.type] || 'bg-slate-100 text-slate-700'}`}>
                      {item.type}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed mb-2">
                    {item.description}
                  </p>

                  <div className="flex items-center gap-4 text-[11px] text-slate-400 font-semibold">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {item.time}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> 📍 {item.location}</span>
                    <span>📱 {item.platform}</span>
                  </div>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Assessed Risk</p>
                <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">{item.risk}%</p>
                <button
                  onClick={() => navigate(`/analyze?q=${item.username.replace('@', '')}`)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline mt-1"
                >
                  <span>Investigate</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
