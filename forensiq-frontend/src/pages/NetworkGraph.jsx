import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { getNetworkGraph } from '../services/api'
import {
  Share2,
  Bot,
  UserCheck,
  ShieldAlert,
  Zap,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Network,
  Layers,
  Activity
} from 'lucide-react'

// ── Cluster colour palette (10 visually distinct hues, dark-mode friendly) ──
const CLUSTER_PALETTE = [
  '#6366f1', // indigo
  '#ef4444', // red
  '#f97316', // orange
  '#10b981', // emerald
  '#3b82f6', // blue
  '#a855f7', // purple
  '#eab308', // yellow
  '#14b8a6', // teal
  '#f43f5e', // rose
  '#84cc16', // lime
]

const clusterColor = (cluster_id) => {
  if (cluster_id === null || cluster_id === undefined) return '#64748b'
  return CLUSTER_PALETTE[cluster_id % CLUSTER_PALETTE.length]
}

// Node radius is a continuous linear scale of risk_score (0-100 → 7-22px).
// High-risk accounts appear larger; zero-risk accounts are smallest.
// No arbitrary type buckets — directly reflects the real ML output.
const riskRadius = (risk_score) => {
  const r = Math.max(0, Math.min(100, risk_score || 0))
  return 7 + (r / 100) * 15   // 7px (risk=0) to 22px (risk=100)
}

export default function NetworkGraph() {
  const svgRef = useRef(null)
  const zoomRef = useRef(null)
  const simulationRef = useRef(null)
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [graphData, setGraphData] = useState({ nodes: [], edges: [], metrics: {}, insufficient_data: false, empty: true })
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchGraphData()
  }, [])

  const fetchGraphData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getNetworkGraph()
      const data = res.data || { nodes: [], edges: [], metrics: {}, insufficient_data: false, empty: true }
      setGraphData(data)
    } catch (err) {
      console.error('Failed to fetch network graph:', err)
      setError('Failed to load network graph data')
      setGraphData({ nodes: [], edges: [], metrics: {}, insufficient_data: false, empty: true })
    } finally {
      setLoading(false)
    }
  }

  // D3 graph — only renders when we have real clustered data
  useEffect(() => {
    const hasGraph = !loading && !graphData.empty && !graphData.insufficient_data && graphData.nodes.length > 0
    if (!hasGraph) return

    const { nodes: rawNodes, edges: rawEdges } = graphData

    // Deep-clone so D3 mutation doesn't corrupt state
    const nodes = rawNodes.map(n => ({ ...n }))
    const edges = rawEdges.map(e => ({ ...e }))

    const container = svgRef.current?.parentElement
    const width = container ? container.clientWidth : 800
    const height = 520

    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height])

    const defs = svg.append('defs')

    // Glow filter
    const filter = defs.append('filter').attr('id', 'node-glow')
    filter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'coloredBlur')
    const merge = filter.append('feMerge')
    merge.append('feMergeNode').attr('in', 'coloredBlur')
    merge.append('feMergeNode').attr('in', 'SourceGraphic')

    const g = svg.append('g')

    // Zoom behaviour
    const zoom = d3.zoom().scaleExtent([0.3, 4]).on('zoom', (event) => {
      g.attr('transform', event.transform)
    })
    zoomRef.current = zoom
    svg.call(zoom)

    // ── Simulation ────────────────────────────────────────────────────────
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(edges).id((d) => d.id).distance(120).strength(d => 0.3 + (d.weight / 100) * 0.5))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(38))

    simulationRef.current = simulation

    // ── Edges — thickness + opacity by weight ─────────────────────────────
    const link = g.append('g')
      .selectAll('line')
      .data(edges)
      .enter()
      .append('line')
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', (d) => 1 + (d.weight / 100) * 4)      // 1px – 5px
      .attr('opacity', (d) => 0.25 + (d.weight / 100) * 0.65)     // 0.25 – 0.90
      .attr('stroke-linecap', 'round')

    // ── Nodes ──────────────────────────────────────────────────────────────
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('cursor', 'pointer')
      .on('click', (event, d) => setSelected(d))
      .call(
        d3.drag()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on('drag', (event, d) => {
            d.fx = event.x
            d.fy = event.y
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0)
            d.fx = null
            d.fy = null
          })
      )

    // Outer glow halo — coloured by cluster, sized by risk_score
    node.append('circle')
      .attr('r', (d) => riskRadius(d.risk_score) + 7)
      .attr('fill', (d) => clusterColor(d.cluster_id))
      .attr('opacity', 0.18)

    // Main node circle — coloured by cluster, sized by risk_score (continuous)
    node.append('circle')
      .attr('r', (d) => riskRadius(d.risk_score))
      .attr('fill', (d) => clusterColor(d.cluster_id))
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5)
      .attr('filter', 'url(#node-glow)')

    // Label text — offset matches node radius
    node.append('text')
      .text((d) => '@' + d.id)
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => riskRadius(d.risk_score) + 16)
      .attr('fill', 'currentColor')
      .attr('class', 'text-[10px] font-mono font-bold fill-slate-700 dark:fill-slate-300 pointer-events-none')

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y)
      node.attr('transform', (d) => `translate(${d.x},${d.y})`)
    })

    return () => simulation.stop()
  }, [graphData, loading])

  // ── Derived stats ─────────────────────────────────────────────────────────
  const metrics = graphData.metrics || {}
  const nodes = graphData.nodes || []
  const edges = graphData.edges || []

  // Cluster → list of members (for legend)
  const clusterMap = nodes.reduce((acc, n) => {
    if (n.cluster_id !== null && n.cluster_id !== undefined) {
      acc[n.cluster_id] = (acc[n.cluster_id] || 0) + 1
    }
    return acc
  }, {})
  const clusters = Object.entries(clusterMap).sort((a, b) => Number(a[0]) - Number(b[0]))

  // Status counts from real ML classifier output (no type bucket needed)
  const statusCounts = nodes.reduce((acc, n) => {
    const s = n.status || 'Real'
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})
  const highRiskCount = nodes.filter(n => (n.risk_score || 0) >= 90).length

  const hasRealGraph = !loading && !graphData.empty && !graphData.insufficient_data && nodes.length > 0

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Share2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Coordinated Account Cluster Map</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Louvain community detection on real pairwise post-similarity. Each colour = one detected cluster.
          </p>
        </div>

        {hasRealGraph && (
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 text-emerald-600 dark:text-emerald-400 text-xs font-bold self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Live Louvain — {nodes.length} nodes</span>
          </span>
        )}
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-16 text-center">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Running community detection…</p>
        </div>
      )}

      {/* ── Error ── */}
      {error && !loading && (
        <div className="bg-white dark:bg-slate-900 border border-rose-200/80 dark:border-rose-900/60 rounded-3xl p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-3" />
          <p className="text-sm font-medium text-rose-600 dark:text-rose-400">{error}</p>
          <button
            onClick={fetchGraphData}
            className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Empty — zero accounts in DB ── */}
      {!loading && !error && graphData.empty && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-16 text-center">
          <Share2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Analyzed Profiles Yet</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Analyze profiles using the Profile Analyzer to build the network graph.
            Each analyzed account becomes a node, and Louvain detects coordinated clusters.
          </p>
          <a
            href="/analyze"
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Analyze a Profile</span>
          </a>
        </div>
      )}

      {/* ── Insufficient data — accounts exist but not enough for clustering ── */}
      {!loading && !error && !graphData.empty && graphData.insufficient_data && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-3xl p-10 text-center">
          <Network className="w-10 h-10 text-amber-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Insufficient Data for Clustering</h3>
          <p className="text-sm text-amber-700 dark:text-amber-300 max-w-lg mx-auto mb-2">
            Analyze more accounts to reveal potential coordinated clusters — currently{' '}
            <strong>{metrics.node_count || nodes.length}</strong> account{nodes.length !== 1 ? 's' : ''} in corpus
            with <strong>{metrics.edge_count || edges.length}</strong> similarity connection{edges.length !== 1 ? 's' : ''}.
            Louvain requires at least <strong>5 accounts</strong> and <strong>3 similarity edges</strong>.
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mb-6">
            Try analyzing bot presets like <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">shadow_bot_99</code> or{' '}
            <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">crypto_pump_bot</code> to populate the corpus.
          </p>
          <a
            href="/analyze"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Analyze More Accounts</span>
          </a>

          {/* Show sparse nodes list if any */}
          {nodes.length > 0 && (
            <div className="mt-8 text-left max-w-lg mx-auto">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                Accounts in corpus ({nodes.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {nodes.map(n => (
                  <span
                    key={n.id}
                    className="text-xs font-mono px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    @{n.id}
                    <span className={`ml-1.5 text-[10px] font-bold ${n.status === 'Fake' ? 'text-rose-500' : n.status === 'Suspicious' ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {n.risk_score}%
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Real clustered graph ── */}
      {hasRealGraph && (
        <>
          {/* ── Louvain Metrics Panel ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                label: 'Communities Found',
                value: metrics.community_count ?? '—',
                icon: <Layers className="w-4 h-4" />,
                color: 'text-indigo-600 dark:text-indigo-400',
                bg: 'bg-indigo-50 dark:bg-indigo-950/40',
              },
              {
                label: 'Modularity Score',
                value: metrics.modularity != null ? metrics.modularity.toFixed(3) : '—',
                icon: <Activity className="w-4 h-4" />,
                color: 'text-emerald-600 dark:text-emerald-400',
                bg: 'bg-emerald-50 dark:bg-emerald-950/40',
              },
              {
                label: 'Accounts (Nodes)',
                value: metrics.node_count ?? nodes.length,
                icon: <Bot className="w-4 h-4" />,
                color: 'text-blue-600 dark:text-blue-400',
                bg: 'bg-blue-50 dark:bg-blue-950/40',
              },
              {
                label: 'Similarity Edges',
                value: metrics.edge_count ?? edges.length,
                icon: <Share2 className="w-4 h-4" />,
                color: 'text-violet-600 dark:text-violet-400',
                bg: 'bg-violet-50 dark:bg-violet-950/40',
              },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 flex items-center gap-3 shadow-sm"
              >
                <div className={`p-2 rounded-2xl ${item.bg} ${item.color}`}>{item.icon}</div>
                <div>
                  <p className="text-xl font-extrabold text-slate-900 dark:text-white">{item.value}</p>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Account status summary — derived from real ML classifier status field ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'High Risk (≥90%)', color: 'bg-rose-500',    count: highRiskCount },
              { label: 'Fake Accounts',    color: 'bg-amber-500',   count: statusCounts['Fake'] || 0 },
              { label: 'Suspicious',       color: 'bg-yellow-500',  count: statusCounts['Suspicious'] || 0 },
              { label: 'Real Accounts',    color: 'bg-emerald-500', count: statusCounts['Real'] || 0 },
            ].map((item) => (
              <div key={item.label} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 flex items-center gap-3 shadow-sm">
                <div className={`w-3.5 h-3.5 rounded-full ${item.color} shadow-xs flex-shrink-0`} />
                <div>
                  <p className="text-xl font-extrabold text-slate-900 dark:text-white">{item.count}</p>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── SVG Canvas ── */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between px-2 pb-3 mb-2 border-b border-slate-100 dark:border-slate-800 text-xs text-slate-500">
              <span>Click node to inspect · Drag to reposition · Scroll to zoom · Node size = risk score · Edge thickness = similarity</span>
              <span className="text-[11px] text-slate-400 flex items-center gap-2">
                {metrics.algorithm || 'Louvain (NetworkX 3.x)'} · threshold {metrics.threshold_used ?? 50}%
                {graphData.cached && <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">cached</span>}
              </span>
            </div>

            <div className="w-full bg-slate-50 dark:bg-slate-950 rounded-2xl overflow-hidden border border-slate-200/60 dark:border-slate-800">
              <svg ref={svgRef} className="w-full h-[520px]" />
            </div>
          </div>

          {/* ── Cluster Legend ── */}
          {clusters.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Louvain Communities — each colour is one detected cluster
              </p>
              <div className="flex flex-wrap gap-3">
                {clusters.map(([clusterId, count]) => (
                  <div
                    key={clusterId}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40"
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: clusterColor(Number(clusterId)) }}
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Cluster {Number(clusterId) + 1}
                    </span>
                    <span className="text-xs text-slate-400">
                      {count} account{count !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Node Inspector ── */}
          {selected && (
            <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 rounded-3xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div
                    className="p-2.5 rounded-2xl"
                    style={{
                      backgroundColor: clusterColor(selected.cluster_id) + '20',
                      color: clusterColor(selected.cluster_id),
                    }}
                  >
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Node Inspector: @{selected.id}</h3>
                    <p className="text-xs text-slate-400">From real analysis data · Louvain cluster assignment</p>
                  </div>
                </div>

                <button
                  onClick={() => setSelected(null)}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-4">
                {[
                  { label: 'Classification', value: selected.status },
                  { label: 'Risk Score',     value: `${selected.risk_score}%` },
                  { label: 'Followers',      value: (selected.followers ?? 0).toLocaleString() },
                  { label: 'Platform',       value: selected.platform },
                  {
                    label: 'Cluster',
                    value: selected.cluster_id !== null && selected.cluster_id !== undefined
                      ? `Cluster ${selected.cluster_id + 1}`
                      : '—',
                    color: clusterColor(selected.cluster_id),
                  },
                ].map((item, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{item.label}</p>
                    <p
                      className="text-sm font-extrabold text-slate-900 dark:text-white"
                      style={item.color ? { color: item.color } : {}}
                    >
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <a
                  href={`/analyze?q=${selected.id}`}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md inline-flex items-center gap-2"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Deep Profile Analysis</span>
                </a>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}