import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllReports, getReportStats, downloadReportPdf } from '../services/api'
import {
  FileText,
  Search,
  Download,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Clock,
  Layers,
  Sparkles,
  CheckCircle2,
  Loader2
} from 'lucide-react'


const statusStyles = {
  Fake: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200/60 dark:border-rose-900/60',
  Real: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-900/60',
  Suspicious: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200/60 dark:border-amber-900/60',
}

const riskTextColor = (score) => {
  if (score >= 75) return 'text-rose-600 dark:text-rose-400'
  if (score >= 40) return 'text-amber-600 dark:text-amber-400'
  return 'text-emerald-600 dark:text-emerald-400'
}

const riskBarBg = (score) => {
  if (score >= 75) return 'bg-rose-500'
  if (score >= 40) return 'bg-amber-500'
  return 'bg-emerald-500'
}

export default function Reports() {
  const [reports, setReports] = useState([])
  const [isSampleData, setIsSampleData] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [downloading, setDownloading] = useState(null)
  const [downloadError, setDownloadError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      const res = await getAllReports()
      const responseData = res.data || {}
      const reportsList = responseData.reports || res.data || []
      const sampleFlag = responseData.is_sample_data || false
      setIsSampleData(sampleFlag)

      if (Array.isArray(reportsList) && reportsList.length > 0) {
        const mapped = reportsList.map((item, idx) => ({
          id: item.id || `RPT-${idx + 1 < 10 ? '00' : '0'}${idx + 1}`,
          analysisId: item.analysis_id || item.id || `RPT-${idx + 1 < 10 ? '00' : '0'}${idx + 1}`,
          username: item.username.startsWith('@') ? item.username : '@' + item.username,
          platform: item.platform || 'Twitter',
          riskScore: item.risk_score !== undefined ? Math.round(item.risk_score) : (item.riskScore || 0),
          status: item.status || 'Real',
          generatedAt: item.analyzed_at ? new Date(item.analyzed_at).toLocaleString() : 'Recent',
          rawItem: item,
        }))
        setReports(mapped)
      }
    } catch (err) {
      console.log('Failed to load reports:', err)
    }
  }

  const filtered = reports.filter((r) => {
    const matchSearch = r.username.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'All' || r.status === filter
    return matchSearch && matchFilter
  })

  const handleDownload = async (report) => {
    const targetId = report.analysisId || report.rawItem?.analysis_id || report.rawItem?.id || report.id || report.username.replace('@', '')
    setDownloading(report.id)
    setDownloadError('')
    try {
      const safeUsername = report.username.replace('@', '').replace(/[^a-zA-Z0-9_-]/g, '_')
      await downloadReportPdf(targetId, `ForensIQ_${report.id}_${safeUsername}_Dossier.pdf`)
    } catch (err) {
      console.error("PDF download failed:", err)
      setDownloadError(`Failed to generate PDF for ${report.username}. Check backend connection.`)
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <span>Forensic Evidence Reports</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Archived forensic dossiers containing ML ensemble predictions, heuristic signals, and evidence indicators.
        </p>
      </div>

      {/* Sample Data Banner */}
      {isSampleData && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-700 dark:text-amber-400">Showing Demonstration Reports</p>
            <p className="text-xs text-amber-600 dark:text-amber-500">No real analyses have been recorded in MongoDB yet. Run scans in the Profile Analyzer to generate actual live forensic reports.</p>
          </div>
        </div>
      )}

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Reports Archived</p>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">{reports.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Fake Bot Dossiers</p>
          <p className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
            {reports.filter((r) => r.status === 'Fake').length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Suspicious Accounts</p>
          <p className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
            {reports.filter((r) => r.status === 'Suspicious').length}
          </p>
        </div>
      </div>

      {/* Search & Filters Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reports by username..."
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl pl-11 pr-4 py-2.5 text-xs sm:text-sm font-medium focus:outline-none"
            />
          </div>

          <div className="flex gap-2">
            {['All', 'Fake', 'Suspicious', 'Real'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition ${filter === f
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Reports List Cards */}
      <div className="space-y-4">
        {filtered.length === 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-400 text-sm font-medium">
            No matching forensic evidence reports found.
          </div>
        )}

        {filtered.map((report) => (
          <div
            key={report.id}
            className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:border-indigo-500/40 transition duration-200"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

              {/* Left Info */}
              <div className="flex items-center gap-4">
                <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <FileText className="w-6 h-6 stroke-[2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{report.username}</h3>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${statusStyles[report.status]}`}>
                      {report.status.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {report.id} • {report.platform} • {report.generatedAt}
                  </p>

                  <p className="text-[11px] text-slate-400 mt-1">
                    Gradient Boosting &amp; Random Forest Classifiers • Cresci Feature Vector
                  </p>
                </div>
              </div>

              {/* Right Action & Risk */}
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Assessed Risk</p>
                  <p className={`text-2xl font-extrabold ${riskTextColor(report.riskScore)}`}>
                    {report.riskScore}%
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleDownload(report)}
                    disabled={downloading === report.id}
                    className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs flex items-center justify-center gap-1.5 whitespace-nowrap transition cursor-pointer"
                  >
                    {downloading === report.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    <span>{downloading === report.id ? 'Generating PDF...' : 'Download Dossier (PDF)'}</span>
                  </button>

                  <button
                    onClick={() => navigate(`/analyze?q=${report.username.replace('@', '')}`)}
                    className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs px-4 py-2 rounded-xl text-center flex items-center justify-center gap-1.5 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Re-Analyze</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Risk Progress Bar */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-3">
              <span className="text-[11px] font-bold text-slate-400 w-24">Risk Gauge</span>
              <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${riskBarBg(report.riskScore)}`} style={{ width: `${report.riskScore}%` }} />
              </div>
              <span className={`text-xs font-bold w-10 text-right ${riskTextColor(report.riskScore)}`}>
                {report.riskScore}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}