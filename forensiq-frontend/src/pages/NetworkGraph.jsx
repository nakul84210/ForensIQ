import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
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
  ExternalLink
} from 'lucide-react'

const generateNetwork = () => {
  const nodes = [
    { id: 'bot_master_01', type: 'master', risk: 98, followers: 12, platform: 'Twitter' },
    { id: 'shadow_bot_99', type: 'bot', risk: 92, followers: 142, platform: 'Twitter' },
    { id: 'crypto_pump_01', type: 'bot', risk: 89, followers: 89, platform: 'Twitter' },
    { id: 'news_fake_spreader', type: 'bot', risk: 94, followers: 201, platform: 'Instagram' },
    { id: 'spam_lord_x', type: 'bot', risk: 91, followers: 67, platform: 'Twitter' },
    { id: 'fake_news_99', type: 'bot', risk: 87, followers: 445, platform: 'Twitter' },
    { id: 'insta_bot_22', type: 'bot', risk: 83, followers: 112, platform: 'Instagram' },
    { id: 'retweet_farm', type: 'amplifier', risk: 76, followers: 3200, platform: 'Twitter' },
    { id: 'like_factory', type: 'amplifier', risk: 71, followers: 2800, platform: 'Instagram' },
    { id: 'john_real_user', type: 'real', risk: 8, followers: 892, platform: 'Twitter' },
    { id: 'genuine_user22', type: 'real', risk: 12, followers: 1200, platform: 'Instagram' },
    { id: 'normal_person', type: 'real', risk: 5, followers: 340, platform: 'Twitter' },
  ]

  const links = [
    { source: 'bot_master_01', target: 'shadow_bot_99' },
    { source: 'bot_master_01', target: 'crypto_pump_01' },
    { source: 'bot_master_01', target: 'news_fake_spreader' },
    { source: 'bot_master_01', target: 'spam_lord_x' },
    { source: 'bot_master_01', target: 'fake_news_99' },
    { source: 'bot_master_01', target: 'insta_bot_22' },
    { source: 'shadow_bot_99', target: 'retweet_farm' },
    { source: 'crypto_pump_01', target: 'retweet_farm' },
    { source: 'news_fake_spreader', target: 'like_factory' },
    { source: 'fake_news_99', target: 'like_factory' },
    { source: 'retweet_farm', target: 'john_real_user' },
    { source: 'like_factory', target: 'genuine_user22' },
    { source: 'spam_lord_x', target: 'normal_person' },
    { source: 'insta_bot_22', target: 'genuine_user22' },
  ]
  return { nodes, links }
}

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
  const [filterType, setFilterType] = useState('All')

  useEffect(() => {
    const { nodes, links } = generateNetwork()
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
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Share2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Interactive Bot Net Cluster Graph</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time topology network map showing links between Bot Master C2 servers, automated bot farms, and target accounts.
          </p>
        </div>

        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 text-emerald-600 dark:text-emerald-400 text-xs font-bold self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>Live Physics Simulation</span>
        </span>
      </div>

      {/* Metric Cards Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Master Bot C2', color: 'bg-rose-500', count: 1, type: 'master' },
          { label: 'Bot Accounts', color: 'bg-amber-500', count: 6, type: 'bot' },
          { label: 'Amplifiers / Farms', color: 'bg-yellow-500', count: 2, type: 'amplifier' },
          { label: 'Real Targets', color: 'bg-emerald-500', count: 3, type: 'real' },
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
                <p className="text-xs text-slate-400">Network ID & Topology Node</p>
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
              { label: 'Node Type', value: selected.type.toUpperCase() },
              { label: 'Assessed Risk', value: `${selected.risk}%` },
              { label: 'Follower Count', value: selected.followers },
              { label: 'Target Network', value: selected.platform },
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
    </div>
  )
}