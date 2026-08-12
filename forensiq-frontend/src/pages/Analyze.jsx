import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import axios from 'axios'
import {
  Search,
  Bot,
  UserCheck,
  AlertTriangle,
  FileText,
  Sparkles,
  SlidersHorizontal,
  Layers,
  MapPin,
  Calendar,
  MessageSquare,
  ThumbsUp,
  Cpu,
  BarChart3,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'

const getRiskStyle = (score) => {
  if (score >= 75) {
    return {
      text: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/50',
      border: 'border-rose-200 dark:border-rose-900/60',
      bar: 'bg-rose-500',
      badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      icon: AlertCircle,
    }
  }
  if (score >= 40) {
    return {
      text: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/50',
      border: 'border-amber-200 dark:border-amber-900/60',
      bar: 'bg-amber-500',
      badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      icon: AlertTriangle,
    }
  }
  return {
    text: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/50',
    border: 'border-emerald-200 dark:border-emerald-900/60',
    bar: 'bg-emerald-500',
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    icon: CheckCircle2,
  }
}

export default function Analyze() {
  const [searchParams] = useSearchParams()
  const queryParam = searchParams.get('q') || ''

  const [username, setUsername] = useState(queryParam)
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
  })

  // Auto trigger search if query param provided
  useEffect(() => {
    if (queryParam) {
      setUsername(queryParam)
      performSearch(queryParam, platform)
    }
  }, [queryParam])

  const performSearch = async (targetUsername, targetPlatform) => {
    if (!targetUsername.trim()) return
    setLoading(true)
    setError('')
    setNotFound(false)
    setResult(null)

    const clean = targetUsername.replace('@', '').trim()
    try {
      const searchRes = await axios.get(`http://localhost:8000/api/analyze/search/${clean}`)
      if (searchRes.data.found) {
        const p = searchRes.data.profile
        const res = await axios.post('http://localhost:8000/api/analyze/profile', {
          username: clean,
          platform: p.platform || targetPlatform,
          followers: p.followers ?? 0,
          following: p.following ?? 0,
          posts: p.posts ?? 0,
          bio: p.bio || '',
          account_age_days: p.account_age_days ?? 0,
          avg_hashtags: p.avg_hashtags ?? 0,
          likes_per_post: p.likes_per_post ?? 0,
          posts_per_day: p.posts_per_day ?? 0,
          verified: p.verified ?? false,
        })
        setResult({
          ...res.data,
          name: p.name || res.data.name || clean,
          recent_posts: p.recent_posts || [],
          location: p.location || 'Unknown',
          profile_image: p.profile_image || '',
          data_source: p.dataset_source || res.data.data_source || 'live_twitter',
        })
      } else {
        setNotFound(true)
      }
    } catch (err) {
      console.error("Search error:", err)
      if (err.code === 'ERR_NETWORK' || !err.response) {
        setError('Network Error: Unable to connect to backend server at http://localhost:8000')
      } else {
        setNotFound(true)
      }
    }
    setLoading(false)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    performSearch(username, platform)
  }

  const handleManualSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const clean = username.replace('@', '').trim()
      const res = await axios.post('http://localhost:8000/api/analyze/profile', {
        username: clean,
        platform,
        followers: parseInt(manual.followers) || 0,
        following: parseInt(manual.following) || 0,
        posts: parseInt(manual.posts) || 0,
        bio: manual.bio || '',
        account_age_days: parseInt(manual.account_age_days) || 0,
        avg_hashtags: parseFloat(manual.avg_hashtags) || 0,
      })
      setResult({ ...res.data, recent_posts: [], location: 'User Input Data' })
      setNotFound(false)
    } catch (err) {
      setError('Analysis failed. Check backend connection.')
    }
    setLoading(false)
  }

  const generateMockProfile = (name, plat) => {
    const isBot = name.includes('bot') || name.includes('pump') || name.includes('fake')
    const score = isBot ? 92 : 14
    return {
      username: name,
      platform: plat,
      risk_score: score,
      status: score >= 75 ? 'Fake' : 'Real',
      account_age_days: isBot ? 45 : 730,
      posts: isBot ? 1200 : 340,
      followers: isBot ? 89 : 1420,
      following: isBot ? 4500 : 310,
      location: isBot ? 'Unverified IP' : 'San Francisco, CA',
      matched_from_dataset: true,
      reasons: isBot
        ? ['Abnormal follower-to-following ratio (1:50)', 'Account age less than 60 days', 'Repetitive hashtag automation patterns']
        : ['Natural follower network growth', 'High post interaction consistency', 'Verified account metadata'],
      model_scores: {
        random_forest: isBot ? 94 : 12,
        xgboost: isBot ? 91 : 16,
      },
      features: {
        follower_ratio: isBot ? 0.02 : 4.58,
        posts_per_day: isBot ? 26.7 : 0.46,
        avg_hashtags: isBot ? 6.8 : 1.2,
        verified: false,
        default_profile_pic: isBot ? true : false,
      },
      shap_explanation: isBot
        ? [
            { feature: 'Follower Ratio', value: 0.285, signal: 'Bot Signal' },
            { feature: 'Posts Per Day', value: 0.242, signal: 'Bot Signal' },
            { feature: 'Bio Spam Score', value: 0.198, signal: 'Bot Signal' },
            { feature: 'Hashtag Repetition', value: 0.145, signal: 'Bot Signal' },
            { feature: 'Account Age', value: 0.112, signal: 'Bot Signal' },
          ]
        : [
            { feature: 'Likes Per Post', value: -0.1192, signal: 'Real Signal' },
            { feature: 'Engagement Rate', value: -0.0994, signal: 'Real Signal' },
            { feature: 'Follower Ratio', value: -0.074, signal: 'Real Signal' },
            { feature: 'Posts Per Day', value: -0.0706, signal: 'Real Signal' },
            { feature: 'Following Count', value: -0.0399, signal: 'Real Signal' },
          ],
      recent_posts: isBot
        ? [
          { content: '🚀 BUY NOW! Crypto guaranteed 1000x returns! Check link in bio #crypto #btc', likes: 2, time: '10m ago' },
          { content: 'Huge announcement coming! Don’t miss out guys click now! #airdrop', likes: 1, time: '25m ago' },
        ]
        : [
          { content: 'Just launched our new open source forensic analytics toolkit! Feedback welcome!', likes: 142, time: '2h ago' },
        ],
    }
  }

  const riskStyle = result ? getRiskStyle(result.risk_score) : null
  const RiskIcon = riskStyle ? riskStyle.icon : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Profile Risk Analyzer
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Evaluate account authenticity using ML classifiers trained on real Twitter API data & SHAP feature analysis.
        </p>
      </div>

      {/* Search Bar Form */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 sm:w-44"
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
                placeholder="Enter username (e.g. shadow_bot_99, nakul_indurkar)..."
                className="w-full bg-amber-50/40 border border-amber-200/80 text-slate-900 rounded-2xl pl-11 pr-4 py-3 text-xs sm:text-sm font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !username.trim()}
              className="disabled:opacity-50 text-sm font-bold rounded-2xl px-6 py-3 shadow-md flex items-center justify-center gap-2 whitespace-nowrap transition"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#0d1b2a', boxShadow: '0 4px 14px rgba(245,158,11,0.3)' }}
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'Evaluating...' : 'Run Forensic Scan'}</span>
            </button>
          </div>

          {/* Quick preset chips */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Try Demo Presets:</span>
            {['shadow_bot_99', 'crypto_pump_bot', 'john_doe_real', 'news_spreader', 'narendramodi', 'elonmusk'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setUsername(preset)
                  performSearch(preset, platform)
                }}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200/60 dark:border-slate-700/60 transition"
              >
                @{preset}
              </button>
            ))}
          </div>
        </form>
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded-3xl p-4 flex items-center gap-3 text-rose-600 dark:text-rose-400 font-semibold text-xs sm:text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Manual Input Box if database not found */}
      {notFound && (
        <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400 font-bold text-sm mb-2">
            <AlertTriangle className="w-5 h-5" />
            <span>Profile @{username.replace(/^@+/, '')} not in pre-indexed dataset</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Enter target profile parameters manually to evaluate AI risk score:
          </p>

          <form onSubmit={handleManualSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              ['followers', 'Followers Count', '1200'],
              ['following', 'Following Count', '4500'],
              ['posts', 'Total Posts', '450'],
              ['account_age_days', 'Account Age (Days)', '45'],
              ['avg_hashtags', 'Avg Hashtags / Post', '5.2'],
              ['bio', 'Bio Snippet', 'Software developer...'],
            ].map(([key, label, ph]) => (
              <div key={key}>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">{label}</label>
                <input
                  type={key === 'bio' ? 'text' : 'number'}
                  placeholder={ph}
                  value={manual[key]}
                  onChange={(e) => setManual((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white"
                />
              </div>
            ))}

            <div className="sm:col-span-3 pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md"
              >
                Run Manual AI Score Calculation
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-12 text-center shadow-sm">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-bold text-slate-900 dark:text-white text-sm">Evaluating Profile Features via Ensemble ML...</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Calculating SHAP values across XGBoost & Random Forest
          </p>
        </div>
      )}

      {/* Results View */}
      {result && !loading && (
        <div className="space-y-6">
          {/* Main Risk Overview Banner */}
          <div className={`border rounded-3xl p-6 sm:p-8 shadow-sm ${riskStyle.bg} ${riskStyle.border}`}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                {result.profile_image ? (
                  <img
                    src={result.profile_image}
                    alt={result.username}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-white dark:border-slate-800 shadow-md"
                  />
                ) : (
                  <div className={`p-4 rounded-2xl bg-white dark:bg-slate-900 shadow-md ${riskStyle.text}`}>
                    <RiskIcon className="w-8 h-8 stroke-[2.2]" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                      {result.name && result.name !== result.username ? result.name : `@${result.username}`}
                    </h3>
                    {result.name && result.name !== result.username && (
                      <span className="text-sm font-semibold text-slate-400">@{result.username}</span>
                    )}
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                      {result.platform}
                    </span>
                    {result.from_twitter_api && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                        ⚡ Live Twitter / X Data
                      </span>
                    )}
                    {result.verified && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500 text-white">
                        ✓ Verified
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2 flex-wrap">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {result.account_age_days} days old</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> {result.posts} posts</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {result.location}</span>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-bold text-slate-700 dark:text-slate-300 mt-2">
                    <span>{result.followers.toLocaleString()} <span className="font-normal text-slate-400">followers</span></span>
                    <span>{result.following.toLocaleString()} <span className="font-normal text-slate-400">following</span></span>
                  </div>
                </div>
              </div>

              {/* Score Meter Dial */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center min-w-[200px] shadow-sm">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Assessed Bot Risk</p>
                <p className={`text-4xl font-extrabold ${riskStyle.text}`}>{result.risk_score}%</p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border mt-2 ${riskStyle.badge}`}>
                  CLASSIFICATION: {result.status.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Reasons List */}
            {result.reasons && result.reasons.length > 0 && (
              <div className="mt-6 pt-5 border-t border-slate-200/60 dark:border-slate-800/80">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Detection Flags & Indicators
                </p>
                <div className="flex flex-wrap gap-2">
                  {result.reasons.map((reason, i) => (
                    <span key={i} className="px-3 py-1 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-800 shadow-xs">
                      ⚠️ {reason}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Model Breakdown Grid */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Cpu className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h4 className="text-base font-bold text-slate-900 dark:text-white">Scoring Signal Breakdown</h4>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
              {result.models_trained
                ? 'Blended score: 50% Random Forest + 50% XGBoost + rule-based heuristics.'
                : 'Powered by rule-based heuristics. Train ML models (train_model.py) to add RF + XGBoost signals.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Object.entries(result.model_scores || {}).map(([model, score]) => (
                <div key={model} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-center">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider capitalize mb-1">
                    {model.replace(/_/g, ' ')}
                  </p>
                  <p className={`text-2xl font-extrabold ${getRiskStyle(score).text}`}>{score}%</p>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-2 overflow-hidden">
                    <div className={`h-full rounded-full ${getRiskStyle(score).bar}`} style={{ width: `${score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SHAP Feature Analysis */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-base font-bold text-slate-900 dark:text-white">SHAP Feature Explainability (XAI)</h4>
              </div>
              {(result.shap_explanation?.length > 0 || result.shap_values) && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
                  TreeExplainer Active
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
              {(result.shap_explanation?.length > 0 || result.shap_values)
                ? 'Shows exact mathematical contribution of each feature to the final bot classification score. Red indicates pushes toward Bot (+), green indicates authentic human signals (-).'
                : 'Raw extracted profile metrics evaluated by the feature pipeline.'}
            </p>

            {result.shap_explanation && result.shap_explanation.length > 0 ? (
              <div className="space-y-3">
                {result.shap_explanation.map((item, idx) => {
                  const val = item.value;
                  const isPositive = item.signal === 'Bot Signal' || val > 0;
                  const absVal = Math.abs(val);
                  const percentWidth = Math.min(Math.round(absVal * 250), 100);
                  const formattedValue = (val > 0 ? `+${val}` : `${val}`) + ` (${item.signal})`;

                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-700 dark:text-slate-300 font-medium">{item.feature}</span>
                        <span className={`font-mono font-bold ${isPositive ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {formattedValue}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${isPositive ? 'bg-red-500' : 'bg-emerald-500'}`}
                          style={{ width: `${percentWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : result.shap_values ? (
              <div className="space-y-3">
                {Object.entries(result.shap_values)
                  .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
                  .slice(0, 8)
                  .map(([key, val]) => {
                    const isPositive = val > 0;
                    const absVal = Math.abs(val);
                    const percentWidth = Math.min(Math.round(absVal * 250), 100);
                    const dispName = key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-slate-700 dark:text-slate-300 font-medium">{dispName}</span>
                          <span className={`font-mono font-bold ${isPositive ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {isPositive ? `+${val}` : val} {isPositive ? '(Bot Signal)' : '(Real Signal)'}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${isPositive ? 'bg-red-500' : 'bg-emerald-500'}`}
                            style={{ width: `${percentWidth}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(result.features || {}).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs font-semibold">
                    <span className="text-slate-600 dark:text-slate-400 capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="text-slate-900 dark:text-white font-mono font-bold">
                      {typeof value === 'boolean' ? (value ? 'TRUE' : 'FALSE') : Math.round(value * 100) / 100}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Posts Feed */}
          {result.recent_posts && result.recent_posts.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
              <h4 className="text-base font-bold text-slate-900 dark:text-white mb-4">Extracted Recent Posts</h4>
              <div className="space-y-3">
                {result.recent_posts.map((post, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                    <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">{post.content}</p>
                    <div className="flex items-center gap-4 text-[11px] text-slate-400 font-semibold">
                      <span className="flex items-center gap-1"><ThumbsUp className="w-3.5 h-3.5 text-indigo-500" /> {post.likes} likes</span>
                      <span>•</span>
                      <span>{post.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}