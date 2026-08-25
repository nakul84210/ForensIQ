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
  AlertTriangle
} from 'lucide-react'

const nodeColor = (type) => {
  if (type === 'master') return '#ef4444'
  if (type === 'bot') return '#f97316'
  if (type === 'amplifier') return '#eab308'
  return '#10b981'
}

const nodeSize = (type) => {
  if (type === 'master') return 18
  if (type === 'amplifier') return 14
  if (type === 'bot') return 10
  return 8
}

export default function NetworkGraph() {
  const svgRef = useRef(null)
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [graphData, setGraphData] = useState({ nodes: [], links: [], empty: true })
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchGraphData()
  }, [])

  const fetchGraphData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getNetworkGraph()
      const data = res.data || { nodes: [], links: [], empty: true }
      setGraphData(data)
    } catch (err) {
      console.error('Failed to fetch network graph:', err)
      setError('Failed to load network graph data')
      setGraphData({ nodes: [], links: [], empty: true })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (loading || graphData.empty || graphData.nodes.length === 0) return

    const { nodes, links } = graphData
    const container = svgRef.current?.parentElement
    const width = container ? container.clientWidth : 800
    const height = 500

    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height])

    const defs = svg.append('defs')

    // Glow filter
    const filter = defs.append('filter').attr('id', 'node-glow')
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur')
    const merge = filter.append('feMerge')
    merge.append('feMergeNode').attr('in', 'coloredBlur')
    merge.append('feMergeNode').attr('in', 'SourceGraphic')

    const g = svg.append('g')

    // Zoom behavior
    const zoom = d3.zoom().scaleExtent([0.5, 3]).on('zoom', (event) => {
      g.attr('transform', event.transform)
    })
    svg.call(zoom)

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d) => d.id).distance(110))
      .force('charge', d3.forceManyBody().strength(-350))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(35))

    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', '#64748b')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,3')
      .attr('opacity', 0.6)

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

    // Outer glow halo
    node.append('circle')
      .attr('r', (d) => nodeSize(d.type) + 6)
      .attr('fill', (d) => nodeColor(d.type))
      .attr('opacity', 0.2)

    // Main node circle
    node.append('circle')
      .attr('r', (d) => nodeSize(d.type))
      .attr('fill', (d) => nodeColor(d.type))
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5)
      .attr('filter', 'url(#node-glow)')

    // Label text
    node.append('text')
      .text((d) => '@' + d.id)
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => nodeSize(d.type) + 16)
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

  // Count node types from real data
  const typeCounts = graphData.nodes.reduce((acc, n) => {
    acc[n.type] = (acc[n.type] || 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Share2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Analyzed Profile Network Graph</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Network topology derived from real analyzed profiles. Nodes represent analyzed accounts; edges connect accounts with similar risk profiles.
          </p>
        </div>

        {!graphData.empty && (
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 text-emerald-600 dark:text-emerald-400 text-xs font-bold self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Live Data — {graphData.nodes.length} nodes</span>
          </span>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-16 text-center">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading network graph data...</p>
        </div>
      )}

      {/* Error State */}
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

      {/* Empty State */}
      {!loading && !error && graphData.empty && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-16 text-center">
          <Share2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Analyzed Profiles Yet</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Analyze profiles using the Profile Analyzer to build the network graph.
            Each analyzed account becomes a node, and connections are drawn between accounts with similar risk profiles.
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

      {/* Real Data View */}
      {!loading && !error && !graphData.empty && (
        <>
          {/* Metric Cards Summary — computed from real data */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'High Risk (≥90%)', color: 'bg-rose-500', count: typeCounts.master || 0 },
              { label: 'Fake Accounts', color: 'bg-amber-500', count: typeCounts.bot || 0 },
              { label: 'Suspicious', color: 'bg-yellow-500', count: typeCounts.amplifier || 0 },
              { label: 'Real Accounts', color: 'bg-emerald-500', count: typeCounts.real || 0 },
            ].map((item) => (
              <div key={item.label} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 flex items-center gap-3 shadow-sm">
                <div className={`w-3.5 h-3.5 rounded-full ${item.color} shadow-xs`} />
                <div>
                  <p className="text-xl font-extrabold text-slate-900 dark:text-white">{item.count}</p>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* SVG Canvas Box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between px-2 pb-3 mb-2 border-b border-slate-100 dark:border-slate-800 text-xs text-slate-500">
              <span>Click any node to inspect. Drag nodes to reposition canvas. Scroll to zoom.</span>
              <span className="text-[11px] text-slate-400">{graphData.links.length} connections</span>
            </div>

            <div className="w-full bg-slate-50 dark:bg-slate-950 rounded-2xl overflow-hidden border border-slate-200/60 dark:border-slate-800">
              <svg ref={svgRef} className="w-full h-[500px]" />
            </div>
          </div>

          {/* Node Inspector Drawer */}
          {selected && (
            <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 rounded-3xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Node Inspector: @{selected.id}</h3>
                    <p className="text-xs text-slate-400">From real analysis data</p>
                  </div>
                </div>

                <button
                  onClick={() => setSelected(null)}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                {[
                  { label: 'Classification', value: selected.status },
                  { label: 'Risk Score', value: `${selected.risk}%` },
                  { label: 'Node Type', value: selected.type.toUpperCase() },
                  { label: 'Platform', value: selected.platform },
                ].map((item, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{item.label}</p>
                    <p className="text-sm font-extrabold text-slate-900 dark:text-white">{item.value}</p>
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