import { useState } from 'react'
import { scanSimilarity } from '../services/api'
import {
  Copy,
  Search,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  Users,
  Clock,
  ExternalLink,
  Sparkles
} from 'lucide-react'

const similarityColor = (score) => {
  if (score >= 90) return 'text-rose-600 dark:text-rose-400'
  if (score >= 75) return 'text-amber-600 dark:text-amber-400'
  return 'text-emerald-600 dark:text-emerald-400'
}

const similarityBarColor = (score) => {
  if (score >= 90) return 'bg-rose-500'
  if (score >= 75) return 'bg-amber-500'
  return 'bg-emerald-500'
}

const riskBadge = (risk) => {
  if (risk === 'high') return 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200/60 dark:border-rose-900/60'
  if (risk === 'medium') return 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200/60 dark:border-amber-900/60'
  return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-900/60'
}

export default function SimilarityScanner() {
  const [text, setText] = useState('')
  const [platform, setPlatform] = useState('All')
  const [threshold, setThreshold] = useState(60)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const handleScan = async () => {
    if (!text.trim()) return
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await scanSimilarity({
        text,
        threshold: threshold / 100,
      })
      setResult({ ...res.data, input: text })
    } catch (err) {
      console.error('Similarity scan API error:', err)
      setError('Backend similarity service unavailable. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const filteredMatches = result
    ? result.matches.filter((m) => platform === 'All' || m.platform === platform)
    : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <Copy className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <span>Content Similarity Scanner</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Detect coordinated copy-paste bot activity across social media networks using TF-IDF & Cosine NLP vector algorithms.
        </p>
      </div>

      {/* Main Input Form Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Suspicious Text or Post Snippet</h3>
          <span className="text-xs text-slate-400">{text.length} characters</span>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste a suspicious post, tweet, or promotional message here to scan for coordinated copies..."
          rows={4}
          className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl p-4 text-xs sm:text-sm font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
        />

        {/* Filter Controls Row */}
        <div className="flex flex-col sm:flex-row gap-4 items-end pt-2">
          <div className="sm:w-48 w-full">
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Platform Filter
            </label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl px-3 py-2.5 text-xs font-semibold focus:outline-none"
            >
              <option value="All">All Networks</option>
              <option value="Twitter">Twitter / X</option>
              <option value="Instagram">Instagram</option>
            </select>
          </div>

          <div className="flex-1 w-full">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              <span>Similarity Threshold</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{threshold}%</span>
            </div>
            <input
              type="range"
              min={40}
              max={100}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full accent-indigo-600 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
            />
          </div>

          <button
            onClick={handleScan}
            disabled={!text.trim() || loading}
            className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white font-bold rounded-2xl px-6 py-2.5 text-xs sm:text-sm shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 whitespace-nowrap transition"
          >
            <Sparkles className="w-4 h-4" />
            <span>{loading ? 'Scanning Database...' : 'Scan for Copies'}</span>
          </button>
        </div>

        {/* Preset Sample Button */}
        <div className="flex items-center gap-2 pt-2 text-xs">
          <span className="font-bold text-slate-400">Sample Prompt:</span>
          <button
            type="button"
            onClick={() => setText('BUY NOW crypto guaranteed 1000x returns click link in bio #airdrop #btc')}
            className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold hover:text-indigo-600 transition"
          >
            "BUY NOW crypto guaranteed 1000x returns..."
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-12 text-center shadow-sm">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-bold text-slate-900 dark:text-white text-sm">Computing Vector Cosine Distances...</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Cross-referencing indexed benchmark post corpus</p>
        </div>
      )}

      {/* Results View */}
      {result && !loading && (
        <div className="space-y-6">

          {/* Verdict Banner */}
          <div className={`border rounded-3xl p-6 shadow-sm ${result.total_matches > 0
              ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
              : 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60'
            }`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl text-white ${result.total_matches > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`}>
                  {result.total_matches > 0 ? <AlertTriangle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Similarity Verdict</p>
                  <h3 className={`text-xl font-extrabold ${result.total_matches > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                    {result.verdict}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {result.total_matches > 0
                      ? `Identified ${filteredMatches.length} accounts sharing near-identical text content.`
                      : 'No duplicate copy-paste content found above threshold.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 self-stretch justify-end">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center min-w-[120px]">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Matches Found</p>
                  <p className={`text-2xl font-extrabold ${result.total_matches > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {filteredMatches.length}
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center min-w-[120px]">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Avg Similarity</p>
                  <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                    {result.average_similarity}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Matches List Grid */}
          {filteredMatches.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
              <h4 className="text-base font-bold text-slate-900 dark:text-white mb-4">Matching Accounts</h4>

              <div className="space-y-3">
                {filteredMatches.map((match, i) => (
                  <div key={i} className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">{match.username}</span>
                        <span className="text-[11px] text-slate-400 font-semibold">{match.platform}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${riskBadge(match.risk)}`}>
                          {match.risk.toUpperCase()} RISK
                        </span>
                      </div>

                      <div className="text-right">
                        <span className={`text-base font-extrabold ${similarityColor(match.similarity)}`}>
                          {match.similarity}% Similarity
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 font-mono bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                      "{match.content}"
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold pt-1">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Posted {match.posted_at}</span>
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {match.followers} followers</span>
                      </div>

                      <div className="w-32 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${similarityBarColor(match.similarity)}`}
                          style={{ width: `${match.similarity}%` }}
                        />
                      </div>
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