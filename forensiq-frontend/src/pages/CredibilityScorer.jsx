import { useState } from 'react'
import { scoreCredibility, searchProfile } from '../services/api'
import {
  CheckCircle2,
  Search,
  Award,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  BarChart2,
  UserCheck,
  Activity,
  MessageSquare,
  Share2,
  Sparkles
} from 'lucide-react'

const gradeColors = {
  A: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-900/60',
  B: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-900/60',
  C: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-900/60',
  D: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/60 border-orange-200 dark:border-orange-900/60',
  F: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-900/60',
}

const scoreBarColor = (score) => {
  if (score >= 75) return 'bg-emerald-500'
  if (score >= 50) return 'bg-indigo-500'
  if (score >= 25) return 'bg-amber-500'
  return 'bg-rose-500'
}

export default function CredibilityScorer() {
  const [username, setUsername] = useState('')
  const [platform, setPlatform] = useState('Twitter')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [manual, setManual] = useState({
    followers: '',
    following: '',
    posts: '',
    bio: '',
    account_age_days: '',
    avg_hashtags: '',
    likes_per_post: '',
    verified: false,
    posts_per_day: '',
  })

  const performScore = async (targetUser, targetPlatform) => {
    if (!targetUser.trim()) return
    setLoading(true)
    setError('')
    setNotFound(false)
    setResult(null)

    const clean = targetUser.replace('@', '').trim()
    try {
      const search = await searchProfile(clean)
      if (search.data.found) {
        const p = search.data.profile
        const res = await scoreCredibility({
          username: clean,
          platform: p.platform || targetPlatform,
          followers: p.followers || 0,
          following: p.following || 0,
          posts: p.posts || 0,
          bio: p.bio || '',
          account_age_days: p.account_age_days || 0,
          avg_hashtags: p.avg_hashtags || 0,
          likes_per_post: p.likes_per_post || 0,
          verified: p.verified || false,
          posts_per_day: p.posts_per_day || 0,
        })
        setResult({ ...res.data, username: '@' + clean, platform: p.platform || targetPlatform })
      } else {
        setNotFound(true)
      }
    } catch (err) {
      console.error("Credibility API error:", err)
      setError("Failed to connect to backend server. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleScore = (e) => {
    e.preventDefault()
    performScore(username, platform)
  }

  const handleManualScore = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const clean = (username.replace('@', '') || 'manual_user').trim()
    try {
      const res = await scoreCredibility({
        username: clean,
        platform,
        followers: parseInt(manual.followers) || 1200,
        following: parseInt(manual.following) || 450,
        posts: parseInt(manual.posts) || 450,
        bio: manual.bio || '',
        account_age_days: parseInt(manual.account_age_days) || 180,
        avg_hashtags: parseFloat(manual.avg_hashtags) || 1.2,
        likes_per_post: parseFloat(manual.likes_per_post) || 25,
        verified: Boolean(manual.verified),
        posts_per_day: parseFloat(manual.posts_per_day) || 1.5,
      })
      setResult({ ...res.data, username: '@' + clean, platform })
      setNotFound(false)
    } catch (err) {
      console.error("Manual credibility score error:", err)
      setError("Failed to score manual profile.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <CheckCircle2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <span>Account Credibility Scorer</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Multi-factor trust evaluation rating accounts across Profile Authenticity, Engagement Pattern, Content Quality, and Network Risk.
        </p>
      </div>

      {/* Search Input Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <form onSubmit={handleScore} className="flex flex-col sm:flex-row gap-3">
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold focus:outline-none sm:w-44"
          >
            <option value="Twitter">Twitter / X</option>
            <option value="Instagram">Instagram</option>
            <option value="Facebook">Facebook</option>
          </select>

          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value)
                setNotFound(false)
              }}
              placeholder="Enter username (e.g. nakul_indurkar, shadow_bot_99)..."
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl pl-11 pr-4 py-3 text-xs sm:text-sm font-medium placeholder-slate-400 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !username.trim()}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white font-bold rounded-2xl px-6 py-3 text-xs sm:text-sm shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 whitespace-nowrap transition"
          >
            <Award className="w-4 h-4" />
            <span>{loading ? 'Evaluating Score...' : 'Score Account Trust'}</span>
          </button>
        </form>

        <div className="flex items-center gap-2 pt-3 text-xs">
          <span className="font-bold text-slate-400">Quick Test:</span>
          {['elonmusk', 'shadow_bot_99', 'verified_user'].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setUsername(preset)
                performScore(preset, platform)
              }}
              className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold hover:text-indigo-600 transition"
            >
              @{preset}
            </button>
          ))}
        </div>
      </div>

      {/* Manual Input Form */}
      {notFound && (
        <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 rounded-3xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400 mb-2">Profile not found in database</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Enter details manually to calculate credibility grade:</p>

          <form onSubmit={handleManualScore} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              ['followers', 'Followers', '1200'],
              ['following', 'Following', '800'],
              ['posts', 'Total Posts', '450'],
              ['account_age_days', 'Account Age (Days)', '730'],
              ['avg_hashtags', 'Avg Hashtags / Post', '1.5'],
              ['likes_per_post', 'Avg Likes / Post', '45'],
              ['posts_per_day', 'Posts Per Day', '1.5'],
              ['bio', 'Bio Snippet', 'Software developer...'],
            ].map(([key, label, ph]) => (
              <div key={key}>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">{label}</label>
                <input
                  type={key === 'bio' ? 'text' : 'number'}
                  placeholder={ph}
                  value={manual[key]}
                  onChange={(e) => setManual((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold"
                />
              </div>
            ))}

            <div className="col-span-2 sm:col-span-4 pt-2">
              <button type="submit" className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md">
                Calculate Credibility Score
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-12 text-center shadow-sm">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-bold text-slate-900 dark:text-white text-sm">Evaluating 16 Credibility Factors Across 4 Categories...</p>
        </div>
      )}

      {/* Results View */}
      {result && !loading && (
        <div className="space-y-6">

          {/* Top Overall Score Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {result.platform}
                </span>
                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{result.username}</h3>
                <p className={`text-lg font-bold mt-1 ${result.verdict_color}`}>{result.verdict}</p>
              </div>

              <div className="flex items-center gap-6">
                {/* Score Circular Ring */}
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Overall Trust Score</p>
                  <div className="relative w-28 h-28 mx-auto">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle cx="50" cy="50" r="40" fill="none" className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="10" />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={result.overall_score >= 75 ? '#10b981' : result.overall_score >= 50 ? '#6366f1' : result.overall_score >= 25 ? '#f59e0b' : '#ef4444'}
                        strokeWidth="10"
                        strokeDasharray={`${result.overall_score * 2.51} 251`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className={`text-3xl font-extrabold ${result.verdict_color}`}>{result.overall_score}</p>
                    </div>
                  </div>
                </div>

                {/* Grade Badge */}
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Trust Grade</p>
                  <div className={`w-24 h-24 rounded-3xl flex items-center justify-center border-2 text-5xl font-extrabold shadow-md ${gradeColors[result.grade]}`}>
                    {result.grade}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Factor Category Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {result.factors.map((factor) => (
              <div key={factor.category} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{factor.icon}</span>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{factor.category}</p>
                </div>
                <p className={`text-3xl font-extrabold ${factor.score >= 75 ? 'text-emerald-600 dark:text-emerald-400' : factor.score >= 50 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {factor.score}/100
                </p>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full mt-3 overflow-hidden">
                  <div className={`h-full rounded-full ${scoreBarColor(factor.score)}`} style={{ width: `${factor.score}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Detailed Factor Breakdown Cards */}
          {result.factors.map((factor) => (
            <div key={factor.category} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
              <h4 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span>{factor.icon}</span>
                <span>{factor.category} Factor Breakdown</span>
                <span className={`ml-auto text-xs font-extrabold px-3 py-1 rounded-full ${factor.score >= 75 ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400'}`}>
                  {factor.score} / 100
                </span>
              </h4>

              <div className="space-y-4">
                {factor.items.map((item) => (
                  <div key={item.label} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white mb-1">
                      <span>{item.label}</span>
                      <span>{item.value} ({item.score}/{item.max} pts)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">{item.detail}</p>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${scoreBarColor((item.score / item.max) * 100)}`} style={{ width: `${(item.score / item.max) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

        </div>
      )}
    </div>
  )
}