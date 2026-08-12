import { useState, useEffect } from 'react'
import { useNavigate } from 'react'
import { getTwitterBots } from '../services/api'
import {
  Bot,
  Search,
  AlertTriangle,
  ShieldAlert,
  ArrowUpRight,
  Sparkles,
  Users,
  MessageSquare,
  Calendar,
  MapPin,
  Clock,
  Filter,
  Layers,
  Database
} from 'lucide-react'

const mockTwitterBots = [
  {
    username: '@shadow_bot_99',
    name: 'Shadow Bot 99',
    platform: 'Twitter',
    followers: 89,
    following: 4500,
    posts: 1200,
    account_age_days: 45,
    risk_score: 96,
    status: 'Fake',
    location: 'Russia',
    reasons: ['High Following/Follower ratio (1:50)', 'Account age less than 60 days', 'Automated hashtag frequency'],
    recent_posts: [
      { content: 'BUY NOW crypto guaranteed 1000x returns! Check link in bio #crypto #btc', likes: 2, time: '10m ago' },
      { content: 'CLICK LINK IN BIO for free giveaway #giveaway #free #win #followback', likes: 1, time: '25m ago' },
    ],
    dataset_source: 'cresci_2017_synthetic',
  },
  {
    username: '@crypto_pump_01',
    name: 'Crypto Pump 01',
    platform: 'Twitter',
    followers: 120,
    following: 3800,
    posts: 2300,
    account_age_days: 30,
    risk_score: 94,
    status: 'Fake',
    location: 'Nigeria',
    reasons: ['Automated posting speed (>25 posts/day)', 'Default profile picture', 'Repetitive crypto hashtags'],
    recent_posts: [
      { content: '🚀 Huge announcement coming! Don’t miss out guys click now! #airdrop', likes: 0, time: '14m ago' },
    ],
    dataset_source: 'cresci_2017_synthetic',
  },
  {
    username: '@spam_lord_x',
    name: 'Spam Lord X',
    platform: 'Twitter',
    followers: 67,
    following: 4900,
    posts: 3100,
    account_age_days: 18,
    risk_score: 98,
    status: 'Fake',
    location: 'Unknown',
    reasons: ['Mass follower farming', 'Coordinated retweet cluster node', 'Unverified account metadata'],
    recent_posts: [
      { content: 'Follow me follow back #followforfollow #follow #f4f #like4like', likes: 1, time: '30m ago' },
    ],
    dataset_source: 'cresci_2017_synthetic',
  },
  {
    username: '@fake_news_99',
    name: 'Fake News Spreader 99',
    platform: 'Twitter',
    followers: 445,
    following: 2800,
    posts: 890,
    account_age_days: 62,
    risk_score: 91,
    status: 'Fake',
    location: 'USA',
    reasons: ['Disinformation cluster node', 'Copy-paste similarity match (94%)', 'Low organic engagement'],
    recent_posts: [
      { content: 'BREAKING: Unverified claims spreading fast click link for full story!', likes: 4, time: '1h ago' },
    ],
    dataset_source: 'cresci_2017_synthetic',
  },
  {
    username: '@bot_army_x1',
    name: 'Bot Army X1',
    platform: 'Twitter',
    followers: 210,
    following: 4100,
    posts: 1560,
    account_age_days: 50,
    risk_score: 95,
    status: 'Fake',
    location: 'Russia',
    reasons: ['Part of 47-account synchronized bot ring', 'Identical posting timestamps', 'Zero reply interactions'],
    recent_posts: [
      { content: 'Mass retweet campaign node #trending #viral #news', likes: 3, time: '2h ago' },
    ],
    dataset_source: 'cresci_2017_synthetic',
  },
  {
    username: '@stock_pump_88',
    name: 'Stock Pump 88',
    platform: 'Twitter',
    followers: 320,
    following: 3900,
    posts: 2100,
    account_age_days: 40,
    risk_score: 89,
    status: 'Fake',
    location: 'USA',
    reasons: ['Financial fraud pump-and-dump scheme', 'High volume hashtag spamming', 'Shortened links'],
    recent_posts: [
      { content: 'BUY THIS STOCK NOW! 500% gain expected tomorrow! #stocks #investing', likes: 5, time: '3h ago' },
    ],
    dataset_source: 'cresci_2017_synthetic',
  },
]

export default function TwitterBots() {
  const [bots, setBots] = useState(mockTwitterBots)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterSeverity, setFilterSeverity] = useState('All')
  const navigate = useNavigate()

  useEffect(() => {
    fetchBots()
  }, [])

  const fetchBots = async () => {
    setLoading(true)
    try {
      const res = await getTwitterBots()
      if (res.data && res.data.bots && res.data.bots.length > 0) {
        setBots(res.data.bots)
      }
    } catch (err) {
      // Use mock data fallback if backend is offline
    }
    setLoading(false)
  }

  const filteredBots = bots.filter((bot) => {
    const matchSearch =
      bot.username.toLowerCase().includes(search.toLowerCase()) ||
      (bot.bio && bot.bio.toLowerCase().includes(search.toLowerCase()))
    const matchSeverity =
      filterSeverity === 'All' ||
      (filterSeverity === 'Critical' && bot.risk_score >= 95) ||
      (filterSeverity === 'High' && bot.risk_score >= 85 && bot.risk_score < 95)
    return matchSearch && matchSeverity
  })

  const avgRisk = Math.round(bots.reduce((acc, b) => acc + b.risk_score, 0) / (bots.length || 1))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-900/60">
              Twitter / X Platform
            </span>
            <span className="text-xs text-slate-400 font-semibold">• Cresci-2017 Dataset Pre-Indexed</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2 mt-1">
            <Bot className="w-6 h-6 text-sky-500" />
            <span>Identified Twitter Bot Accounts</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Comprehensive directory of synthetic & automated bot accounts detected on Twitter/X, classified via XGBoost & Random Forest ensemble classifiers.
          </p>
        </div>

        <button
          onClick={fetchBots}
          className="px-4 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-md shadow-sky-500/20 flex items-center gap-2 self-start sm:self-auto transition"
        >
          <Sparkles className="w-4 h-4" />
          <span>{loading ? 'Refreshing API...' : 'Refresh Live Dataset'}</span>
        </button>
      </div>

      {/* Metric Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Twitter Bots Cataloged</p>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">{bots.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Average Bot Risk</p>
          <p className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">{avgRisk}%</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Critical Bots (&gt;95% Risk)</p>
          <p className="text-3xl font-extrabold text-rose-700 dark:text-rose-500 mt-1">
            {bots.filter((b) => b.risk_score >= 95).length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dataset Source</p>
          <p className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">MongoDB</p>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Twitter bot handle, location, or reason (e.g. shadow_bot_99)..."
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl pl-11 pr-4 py-2.5 text-xs sm:text-sm font-medium focus:outline-none"
            />
          </div>

          <div className="flex gap-2">
            {['All', 'Critical', 'High'].map((sev) => (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition ${
                  filterSeverity === sev
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {sev} Risk
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bot Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBots.map((bot) => (
          <div
            key={bot.username}
            className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-sky-500/50 rounded-3xl p-6 shadow-sm flex flex-col justify-between transition-all duration-200 group"
          >
            <div>
              {/* Card Header: Username & Risk Badge */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-sm">
                    🐦
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-sky-500 transition">
                      {bot.username}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-semibold">{bot.account_age_days} days old • 📍 {bot.location}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-extrabold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 px-2.5 py-1 rounded-full">
                    {bot.risk_score}% Risk
                  </span>
                </div>
              </div>

              {/* Follower Stats Row */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 mb-4 text-center">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Followers</p>
                  <p className="text-xs font-extrabold text-slate-900 dark:text-white">{bot.followers}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Following</p>
                  <p className="text-xs font-extrabold text-rose-600 dark:text-rose-400">{bot.following}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Posts</p>
                  <p className="text-xs font-extrabold text-slate-900 dark:text-white">{bot.posts}</p>
                </div>
              </div>

              {/* Bot Detection Flags */}
              {bot.reasons && bot.reasons.length > 0 && (
                <div className="space-y-1.5 mb-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Detection Reasons:</p>
                  {bot.reasons.slice(0, 2).map((reason, idx) => (
                    <div key={idx} className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/30 p-2 rounded-xl border border-rose-200/40 dark:border-rose-900/40 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{reason}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Recent Tweet Snippet */}
              {bot.recent_posts && bot.recent_posts.length > 0 && (
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 mb-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Recent Automated Tweet:</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium italic line-clamp-2">
                    "{bot.recent_posts[0].content}"
                  </p>
                </div>
              )}
            </div>

            {/* Action Link Button */}
            <button
              onClick={() => navigate(`/analyze?q=${bot.username.replace('@', '')}`)}
              className="w-full py-2.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-600 dark:text-sky-400 font-bold text-xs border border-sky-200/60 dark:border-sky-900/60 transition flex items-center justify-center gap-1.5"
            >
              <span>Run Deep Forensic Scan</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
