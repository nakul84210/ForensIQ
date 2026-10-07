import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginUser, registerUser } from '../services/api'
import {
  ShieldAlert, Mail, Lock, User, ArrowRight, Eye, EyeOff,
  Sparkles, Zap, Globe, Bot, ScanFace, TrendingUp, ChevronRight,
  Network, FileSearch, Upload, Cpu, CheckCircle, BarChart3,
} from 'lucide-react'

/* ─────────────── Animated Canvas Background ─────────────────── */
function ParticleCanvas() {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let animId
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)
    const nodes = Array.from({ length: 55 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 1.8 + 0.6,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      opacity: Math.random() * 0.6 + 0.2,
    }))
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 130) {
            ctx.beginPath()
            ctx.strokeStyle = `rgba(99,102,241,${((130 - dist) / 130) * 0.12})`
            ctx.lineWidth = 0.8
            ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.stroke()
          }
        }
      }
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(139,92,246,${n.opacity})`; ctx.fill()
      })
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />
}

/* ─────────────── Radar Ring Visual ─────────────────────────── */
function RadarRing() {
  return (
    <div className="fiq-radar-wrap">
      <div className="fiq-radar-ring fiq-radar-ring-1" />
      <div className="fiq-radar-ring fiq-radar-ring-2" />
      <div className="fiq-radar-ring fiq-radar-ring-3" />
      <div className="fiq-radar-sweep" />
      <div className="fiq-radar-dot" />
      {/* Blips */}
      {[
        { top: '28%', left: '62%', color: '#34d399' },
        { top: '55%', left: '22%', color: '#f87171' },
        { top: '70%', left: '68%', color: '#fbbf24' },
        { top: '38%', left: '40%', color: '#818cf8' },
      ].map((b, i) => (
        <div key={i} className="fiq-radar-blip" style={{ top: b.top, left: b.left, '--bcolor': b.color }} />
      ))}
    </div>
  )
}

/* ─────────────── Rotating Tool Showcase ─────────────────────── */
const TOOLS = [
  { icon: Bot, label: 'Twitter Bot Detector', desc: 'RF + XGB + LightGBM ensemble trained on Cresci-2017, with SHAP explainability', color: '#818cf8' },
  { icon: ScanFace, label: 'Deepfake Inspector', desc: 'Multi-quality ELA + GAN artifact analysis on uploaded images', color: '#a78bfa' },
  { icon: Network, label: 'Network Graph', desc: 'Interactive propagation graph of suspicious account clusters', color: '#34d399' },
  { icon: Globe, label: 'Threat Feed', desc: 'Live misinformation heatmaps with spatial clustering across regions', color: '#38bdf8' },
  { icon: TrendingUp, label: 'Credibility Scorer', desc: 'Multi-signal account trust score with behavioral pattern matching', color: '#fb923c' },
  { icon: FileSearch, label: 'Similarity Scanner', desc: 'TF-IDF & semantic embedding analysis to detect coordinated post templates', color: '#f472b6' },
]

function ToolShowcase() {
  const [active, setActive] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setActive(p => (p + 1) % TOOLS.length), 3200)
    return () => clearInterval(t)
  }, [])
  const tool = TOOLS[active]
  return (
    <div className="fiq-showcase">
      <div className="fiq-showcase-header">
        <span className="fiq-showcase-eyebrow">Platform Modules</span>
        <div className="fiq-showcase-dots">
          {TOOLS.map((_, i) => (
            <button key={i} className={`fiq-showcase-dot ${i === active ? 'active' : ''}`} onClick={() => setActive(i)} />
          ))}
        </div>
      </div>
      <div className="fiq-showcase-card" key={active} style={{ '--accent': tool.color }}>
        <div className="fiq-showcase-icon">
          <tool.icon size={20} />
        </div>
        <div className="fiq-showcase-content">
          <p className="fiq-showcase-title">{tool.label}</p>
          <p className="fiq-showcase-desc">{tool.desc}</p>
        </div>
      </div>
      <div className="fiq-showcase-track">
        {TOOLS.map((t, i) => (
          <button
            key={i}
            className={`fiq-showcase-chip ${i === active ? 'active' : ''}`}
            onClick={() => setActive(i)}
            style={{ '--accent': t.color }}
          >
            <t.icon size={11} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ─────────────── How It Works Steps ─────────────────────────── */
const STEPS = [
  { icon: Upload, num: '01', title: 'Submit', desc: 'Enter a Twitter handle or upload an image file for analysis' },
  { icon: Cpu, num: '02', title: 'Analyze', desc: 'Multi-model AI pipeline runs forensic analysis' },
  { icon: BarChart3, num: '03', title: 'Report', desc: 'Get a detailed verdict with confidence scores & evidence' },
]

function HowItWorks() {
  return (
    <div className="fiq-how">
      <p className="fiq-how-label">How It Works</p>
      <div className="fiq-how-steps">
        {STEPS.map((s, i) => (
          <div key={i} className="fiq-how-step">
            <div className="fiq-how-num">{s.num}</div>
            <div className="fiq-how-icon"><s.icon size={14} /></div>
            <p className="fiq-how-title">{s.title}</p>
            <p className="fiq-how-desc">{s.desc}</p>
            {i < STEPS.length - 1 && <div className="fiq-how-connector" />}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─────────────── Trust Badges ───────────────────────────────── */
const BADGES = [
  'SHAP Explainability', 'Cresci-2017 Dataset', 'GAN Detection', 'ELA Analysis', 'Twitter API Integration',
]

function TrustBadges() {
  return (
    <div className="fiq-trust">
      <p className="fiq-trust-label">Powered by</p>
      <div className="fiq-trust-row">
        {BADGES.map(b => (
          <span key={b} className="fiq-trust-badge">
            <CheckCircle size={10} />
            {b}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ─────────────── Main Login Component ───────────────────────── */
export default function Login() {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [focusField, setFocusField] = useState(null)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      if (mode === 'register') {
        const res = await registerUser({ name, email, password })
        localStorage.setItem('token', res.data.access_token)
        localStorage.setItem('user', JSON.stringify({ name: res.data.name || name, email: res.data.email || email }))
        navigate('/dashboard')
      } else {
        const res = await loginUser({ email, password })
        localStorage.setItem('token', res.data.access_token)
        localStorage.setItem('user', JSON.stringify({ name: res.data.name || 'Admin', email: res.data.email || email }))
        navigate('/dashboard')
      }
    } catch (err) {
      if (mode === 'login' && email === 'admin@forensiq.com' && password === 'admin123') {
        localStorage.setItem('token', 'demo-token-12345')
        localStorage.setItem('user', JSON.stringify({ name: 'Admin Investigator', email: 'admin@forensiq.com' }))
        navigate('/dashboard')
      } else {
        setError(err.response?.data?.detail || 'Authentication failed. Please check your credentials or use the demo account.')
      }
    }
    setLoading(false)
  }

  const fillDemo = () => { setMode('login'); setEmail('admin@forensiq.com'); setPassword('admin123') }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; }

        .fiq-login-root {
          min-height: 100vh;
          background: #080e24;
          font-family: 'Inter', system-ui, sans-serif;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }

        .fiq-orb-1 { position: fixed; top: -15%; left: -10%; width: 600px; height: 600px; background: radial-gradient(circle, rgba(99,102,241,0.30) 0%, transparent 70%); border-radius: 50%; pointer-events: none; z-index: 0; }
        .fiq-orb-2 { position: fixed; bottom: -20%; right: -10%; width: 700px; height: 700px; background: radial-gradient(circle, rgba(139,92,246,0.24) 0%, transparent 70%); border-radius: 50%; pointer-events: none; z-index: 0; }
        .fiq-orb-3 { position: fixed; top: 40%; left: 35%; width: 400px; height: 400px; background: radial-gradient(circle, rgba(16,185,129,0.10) 0%, transparent 70%); border-radius: 50%; pointer-events: none; z-index: 0; }

        .fiq-grid-overlay {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-image: linear-gradient(rgba(99,102,241,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.07) 1px, transparent 1px);
          background-size: 48px 48px;
        }

        /* ── Layout ── */
        .fiq-login-inner {
          position: relative; z-index: 10;
          display: grid; grid-template-columns: 1fr 1fr;
          min-height: 100vh;
        }

        @media (max-width: 960px) {
          .fiq-login-inner { grid-template-columns: 1fr; }
          .fiq-left-panel { display: none !important; }
          .fiq-right-panel { padding: 32px 20px !important; }
        }

        /* ── Left Panel ── */
        .fiq-left-panel {
          display: flex; flex-direction: column;
          padding: 40px 52px; gap: 28px; overflow-y: auto;
        }

        .fiq-brand { display: flex; align-items: center; gap: 12px; animation: slideDown 0.5s ease both; }

        .fiq-logo {
          width: 44px; height: 44px; border-radius: 14px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          display: flex; align-items: center; justify-content: center; color: white;
          box-shadow: 0 0 24px rgba(99,102,241,0.4), 0 0 8px rgba(99,102,241,0.2);
          flex-shrink: 0;
        }

        .fiq-logo-text h1 { font-size: 1.35rem; font-weight: 800; color: #fff; letter-spacing: -0.03em; margin: 0; }
        .fiq-logo-text p  { font-size: 0.7rem; color: #8b92a9; margin: 0; letter-spacing: 0.05em; text-transform: uppercase; }

        /* Hero */
        .fiq-hero { animation: fadeUp 0.5s 0.05s both; }

        .fiq-badge {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 5px 14px; border-radius: 999px;
          background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.25);
          color: #818cf8; font-size: 0.72rem; font-weight: 700;
          letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 18px; width: fit-content;
        }

        .fiq-hero-title {
          font-size: clamp(1.8rem, 3.2vw, 2.8rem); font-weight: 900;
          line-height: 1.1; letter-spacing: -0.04em; color: #fff; margin: 0 0 16px;
        }

        .fiq-hero-title .gradient-text {
          background: linear-gradient(135deg, #6366f1 0%, #a78bfa 50%, #34d399 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }

        .fiq-hero-sub { font-size: 0.88rem; color: #8b92a9; line-height: 1.7; margin: 0; max-width: 440px; }

        /* ── Radar ── */
        .fiq-radar-wrap {
          position: relative; width: 100%; height: 160px;
          display: flex; align-items: center; justify-content: center;
          animation: fadeUp 0.5s 0.1s both;
        }

        .fiq-radar-ring {
          position: absolute; border-radius: 50%;
          border: 1px solid rgba(99,102,241,0.2);
        }
        .fiq-radar-ring-1 { width: 130px; height: 130px; }
        .fiq-radar-ring-2 { width: 90px;  height: 90px;  border-color: rgba(99,102,241,0.3); }
        .fiq-radar-ring-3 { width: 50px;  height: 50px;  border-color: rgba(99,102,241,0.4); }

        .fiq-radar-sweep {
          position: absolute; width: 130px; height: 130px; border-radius: 50%;
          background: conic-gradient(from 0deg, transparent 75%, rgba(99,102,241,0.5) 100%);
          animation: radarSweep 3s linear infinite;
        }

        .fiq-radar-dot {
          position: absolute; width: 8px; height: 8px; border-radius: 50%;
          background: #818cf8;
          box-shadow: 0 0 12px rgba(99,102,241,0.8);
        }

        .fiq-radar-blip {
          position: absolute; width: 6px; height: 6px; border-radius: 50%;
          background: var(--bcolor);
          box-shadow: 0 0 8px var(--bcolor);
          animation: blipPulse 2.5s ease-in-out infinite;
        }

        @keyframes radarSweep { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes blipPulse  { 0%,100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.3); } }

        /* ── Tool Showcase ── */
        .fiq-showcase { animation: fadeUp 0.5s 0.15s both; }

        .fiq-showcase-header {
          display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;
        }

        .fiq-showcase-eyebrow { font-size: 0.68rem; font-weight: 700; color: #6b7a9b; text-transform: uppercase; letter-spacing: 0.08em; }

        .fiq-showcase-dots { display: flex; gap: 5px; }
        .fiq-showcase-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: rgba(255,255,255,0.22); border: none; cursor: pointer; transition: all 0.2s; padding: 0;
        }
        .fiq-showcase-dot.active { background: #818cf8; box-shadow: 0 0 6px rgba(129,140,248,0.6); }

        .fiq-showcase-card {
          display: flex; align-items: center; gap: 14px;
          padding: 14px 16px; border-radius: 14px;
          background: color-mix(in srgb, var(--accent) 10%, rgba(255,255,255,0.05));
          border: 1px solid color-mix(in srgb, var(--accent) 28%, transparent);
          margin-bottom: 10px;
          animation: showcaseIn 0.35s ease both;
        }

        .fiq-showcase-icon {
          width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0;
          background: color-mix(in srgb, var(--accent) 18%, transparent);
          border: 1px solid color-mix(in srgb, var(--accent) 28%, transparent);
          color: var(--accent);
          display: flex; align-items: center; justify-content: center;
        }

        .fiq-showcase-title { font-size: 0.85rem; font-weight: 700; color: #f0f4ff; margin: 0 0 3px; }
        .fiq-showcase-desc  { font-size: 0.72rem; color: #8b92a9; margin: 0; line-height: 1.5; }

        .fiq-showcase-track {
          display: flex; flex-wrap: wrap; gap: 6px;
        }

        .fiq-showcase-chip {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 10px; border-radius: 99px;
          background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12);
          color: #8b92a9; font-size: 0.68rem; font-weight: 600;
          cursor: pointer; transition: all 0.2s; font-family: 'Inter', sans-serif;
        }

        .fiq-showcase-chip.active {
          background: color-mix(in srgb, var(--accent) 15%, transparent);
          border-color: color-mix(in srgb, var(--accent) 30%, transparent);
          color: var(--accent);
        }

        .fiq-showcase-chip:not(.active):hover { border-color: rgba(255,255,255,0.22); color: #c4c9d9; }

        @keyframes showcaseIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

        /* ── How It Works ── */
        .fiq-how { animation: fadeUp 0.5s 0.2s both; }

        .fiq-how-label {
          font-size: 0.68rem; font-weight: 700; color: #6b7a9b;
          text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px;
        }

        .fiq-how-steps { display: flex; align-items: flex-start; gap: 0; position: relative; }

        .fiq-how-step {
          display: flex; flex-direction: column; align-items: center;
          text-align: center; flex: 1; position: relative;
        }

        .fiq-how-num {
          font-size: 0.62rem; font-weight: 800; color: #6366f1;
          font-family: 'JetBrains Mono', monospace; margin-bottom: 6px;
          letter-spacing: 0.05em;
        }

        .fiq-how-icon {
          width: 36px; height: 36px; border-radius: 10px; margin-bottom: 8px;
          background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.25);
          color: #818cf8; display: flex; align-items: center; justify-content: center;
        }

        .fiq-how-title { font-size: 0.78rem; font-weight: 700; color: #f0f4ff; margin: 0 0 4px; }
        .fiq-how-desc  { font-size: 0.68rem; color: #8b92a9; margin: 0; line-height: 1.5; padding: 0 4px; }

        .fiq-how-connector {
          position: absolute; top: 44px; left: calc(50% + 22px);
          width: calc(100% - 44px); height: 1px;
          background: linear-gradient(90deg, rgba(99,102,241,0.4), rgba(99,102,241,0.15));
        }

        /* ── Trust Badges ── */
        .fiq-trust { animation: fadeUp 0.5s 0.25s both; }

        .fiq-trust-label {
          font-size: 0.65rem; font-weight: 700; color: #5a6380;
          text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px;
        }

        .fiq-trust-row { display: flex; flex-wrap: wrap; gap: 6px; }

        .fiq-trust-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 10px; border-radius: 99px;
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
          color: #8b92a9; font-size: 0.67rem; font-weight: 600; letter-spacing: 0.02em;
          transition: all 0.2s;
        }

        .fiq-trust-badge:hover {
          background: rgba(99,102,241,0.08); border-color: rgba(99,102,241,0.2); color: #818cf8;
        }

        /* ── Right Panel (Auth) ── */
        .fiq-right-panel {
          display: flex; align-items: center; justify-content: center;
          padding: 48px 56px; position: relative;
        }

        .fiq-right-panel::before {
          content: ''; position: absolute; left: 0; top: 10%; bottom: 10%; width: 1px;
          background: linear-gradient(to bottom, transparent, rgba(99,102,241,0.2), transparent);
        }

        @media (max-width: 960px) { .fiq-right-panel::before { display: none; } }

        .fiq-auth-card {
          width: 100%; max-width: 400px;
          animation: scaleIn 0.5s 0.1s both;
        }

        .fiq-mobile-brand { display: none; align-items: center; gap: 10px; margin-bottom: 32px; }
        @media (max-width: 960px) { .fiq-mobile-brand { display: flex; } }

        /* Tab switcher */
        .fiq-tabs {
          display: flex; background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.11); border-radius: 12px;
          padding: 4px; margin-bottom: 28px;
        }

        .fiq-tab {
          flex: 1; padding: 10px; border-radius: 9px; font-size: 0.8rem; font-weight: 700;
          border: none; cursor: pointer; transition: all 0.2s ease; background: transparent;
          color: #8b92a9; font-family: 'Inter', sans-serif;
        }

        .fiq-tab.active {
          background: linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.25));
          color: #a5b4fc; border: 1px solid rgba(99,102,241,0.3);
          box-shadow: 0 2px 12px rgba(99,102,241,0.15);
        }

        .fiq-tab:not(.active):hover { color: #c4c9d9; background: rgba(255,255,255,0.07); }

        /* Auth heading */
        .fiq-auth-heading { margin-bottom: 28px; }
        .fiq-auth-heading h2 { font-size: 1.5rem; font-weight: 800; color: #fff; letter-spacing: -0.03em; margin: 0 0 6px; }
        .fiq-auth-heading p  { font-size: 0.8rem; color: #8b92a9; margin: 0; }

        /* Error */
        .fiq-error {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 12px 14px; border-radius: 12px;
          background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
          color: #f87171; font-size: 0.78rem; font-weight: 500; margin-bottom: 20px;
        }

        /* Form */
        .fiq-form { display: flex; flex-direction: column; gap: 16px; }
        .fiq-field { display: flex; flex-direction: column; gap: 7px; }

        .fiq-label { font-size: 0.72rem; font-weight: 700; color: #8b92a9; letter-spacing: 0.07em; text-transform: uppercase; }

        .fiq-input-wrap { position: relative; }

        .fiq-field-icon {
          position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
          color: #5a6380; pointer-events: none; transition: color 0.2s;
        }
        .fiq-field.focused .fiq-field-icon { color: #818cf8; }

        .fiq-input {
          width: 100%; height: 48px; padding: 0 42px 0 42px;
          background: rgba(255,255,255,0.07); border: 1.5px solid rgba(255,255,255,0.13);
          border-radius: 12px; color: #f0f4ff; font-size: 0.875rem;
          font-family: 'Inter', sans-serif; font-weight: 500;
          outline: none; transition: all 0.2s ease; -webkit-appearance: none;
        }
        .fiq-input::placeholder { color: #4a5270; font-weight: 400; }
        .fiq-input:hover  { border-color: rgba(255,255,255,0.2); background: rgba(255,255,255,0.09); }
        .fiq-input:focus  { border-color: rgba(99,102,241,0.6); background: rgba(99,102,241,0.06); box-shadow: 0 0 0 3px rgba(99,102,241,0.12), 0 0 20px rgba(99,102,241,0.08); }

        .fiq-toggle-pw {
          position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; color: #5a6380; padding: 0;
          display: flex; transition: color 0.2s;
        }
        .fiq-toggle-pw:hover { color: #c4c9d9; }

        /* CTA Button */
        .fiq-btn-cta {
          width: 100%; height: 52px; border: none; border-radius: 14px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white; font-size: 0.9rem; font-weight: 700; font-family: 'Inter', sans-serif;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
          margin-top: 4px; transition: all 0.2s ease;
          box-shadow: 0 4px 24px rgba(99,102,241,0.3), 0 1px 4px rgba(0,0,0,0.2);
          position: relative; overflow: hidden;
        }
        .fiq-btn-cta::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, #818cf8 0%, #a78bfa 100%);
          opacity: 0; transition: opacity 0.2s;
        }
        .fiq-btn-cta:hover:not(:disabled)::before { opacity: 1; }
        .fiq-btn-cta:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(99,102,241,0.45), 0 2px 8px rgba(0,0,0,0.2); }
        .fiq-btn-cta:active:not(:disabled) { transform: translateY(0); }
        .fiq-btn-cta:disabled { opacity: 0.55; cursor: not-allowed; }
        .fiq-btn-cta span, .fiq-btn-cta svg { position: relative; z-index: 1; }
        .fiq-arrow-icon { transition: transform 0.2s; }
        .fiq-btn-cta:hover:not(:disabled) .fiq-arrow-icon { transform: translateX(4px); }

        /* Loading dots */
        .fiq-loading-dots { display: flex; gap: 4px; }
        .fiq-loading-dots span { width: 5px; height: 5px; border-radius: 50%; background: white; animation: dotPulse 1.2s infinite; }
        .fiq-loading-dots span:nth-child(2) { animation-delay: 0.2s; }
        .fiq-loading-dots span:nth-child(3) { animation-delay: 0.4s; }

        /* Demo */
        .fiq-demo-section {
          margin-top: 20px; padding: 14px 16px; border-radius: 12px;
          background: rgba(251,191,36,0.05); border: 1px solid rgba(251,191,36,0.12);
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
        }
        .fiq-demo-info { display: flex; flex-direction: column; gap: 2px; }
        .fiq-demo-info span:first-child { font-size: 0.7rem; color: #8b92a9; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }
        .fiq-demo-info span:last-child   { font-size: 0.75rem; color: #e2e8f0; font-family: 'JetBrains Mono', monospace; }
        .fiq-demo-btn {
          display: flex; align-items: center; gap: 6px; padding: 8px 14px;
          border-radius: 9px; background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.2);
          color: #fbbf24; font-size: 0.75rem; font-weight: 700; font-family: 'Inter', sans-serif;
          cursor: pointer; transition: all 0.2s; white-space: nowrap; flex-shrink: 0;
        }
        .fiq-demo-btn:hover { background: rgba(251,191,36,0.18); transform: translateY(-1px); }

        /* Footer */
        .fiq-footer {
          position: relative; z-index: 10; text-align: center; padding: 16px;
          font-size: 0.7rem; color: #5a6380; border-top: 1px solid rgba(255,255,255,0.07);
        }

        /* ── Keyframes ── */
        @keyframes fadeUp   { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideDown{ from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn  { from { opacity: 0; transform: scale(0.97) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes dotPulse { 0%,80%,100% { transform: scale(0.7); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
        @keyframes pulse-ring { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(1.6); opacity: 0; } }

        .live-dot { display: inline-block; width: 7px; height: 7px; background: #34d399; border-radius: 50%; position: relative; }
        .live-dot::before { content: ''; position: absolute; inset: 0; border-radius: 50%; background: #34d399; animation: pulse-ring 1.5s ease-out infinite; }
      `}</style>

      <div className="fiq-login-root">
        <ParticleCanvas />
        <div className="fiq-orb-1" /><div className="fiq-orb-2" /><div className="fiq-orb-3" />
        <div className="fiq-grid-overlay" />

        <div className="fiq-login-inner">

          {/* ── Left Panel ── */}
          <div className="fiq-left-panel">
            {/* Brand */}
            <div className="fiq-brand">
              <div className="fiq-logo"><ShieldAlert size={22} strokeWidth={2.2} /></div>
              <div className="fiq-logo-text">
                <h1>ForensIQ</h1>
                <p>Social Media Intelligence</p>
              </div>
            </div>

            {/* Hero */}
            <div className="fiq-hero">
              <div className="fiq-badge">
                <span className="live-dot" />
                <Sparkles size={11} />
                <span>Next-Gen Forensic AI Platform</span>
              </div>
              <h2 className="fiq-hero-title">
                Expose threats.<br />
                <span className="gradient-text">Protect the truth.</span>
              </h2>
              <p className="fiq-hero-sub">
                Detect bot networks, deepfakes, and misinformation campaigns with
                AI precision — before they spread.
              </p>
            </div>

            {/* Radar Animation */}
            <RadarRing />

            {/* Rotating Tool Showcase */}
            <ToolShowcase />

            {/* How It Works */}
            <HowItWorks />

            {/* Trust Badges */}
            <TrustBadges />
          </div>

          {/* ── Right Panel ── */}
          <div className="fiq-right-panel">
            <div className="fiq-auth-card">
              {/* Mobile Brand */}
              <div className="fiq-mobile-brand">
                <div className="fiq-logo"><ShieldAlert size={20} strokeWidth={2.2} /></div>
                <div className="fiq-logo-text"><h1>ForensIQ</h1><p>Social Media Intelligence</p></div>
              </div>

              {/* Tabs */}
              <div className="fiq-tabs" role="tablist">
                <button id="tab-signin" role="tab" aria-selected={mode === 'login'}
                  className={`fiq-tab ${mode === 'login' ? 'active' : ''}`}
                  onClick={() => { setMode('login'); setError('') }}>Sign In</button>
                <button id="tab-register" role="tab" aria-selected={mode === 'register'}
                  className={`fiq-tab ${mode === 'register' ? 'active' : ''}`}
                  onClick={() => { setMode('register'); setError('') }}>Register</button>
              </div>

              {/* Heading */}
              <div className="fiq-auth-heading">
                <h2>{mode === 'login' ? 'Welcome back' : 'Create account'}</h2>
                <p>{mode === 'login' ? 'Sign in to access your investigative workspace' : 'Register your analyst credentials to get started'}</p>
              </div>

              {/* Error */}
              {error && (
                <div className="fiq-error" role="alert">
                  <ChevronRight size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{error}</span>
                </div>
              )}

              {/* Form */}
              <form className="fiq-form" onSubmit={handleSubmit}>
                {mode === 'register' && (
                  <div className={`fiq-field ${focusField === 'name' ? 'focused' : ''}`}>
                    <label className="fiq-label" htmlFor="field-name">Full Name</label>
                    <div className="fiq-input-wrap">
                      <User size={15} className="fiq-field-icon" />
                      <input id="field-name" type="text" className="fiq-input" value={name}
                        placeholder="Dr. Alex Vance" required onChange={e => setName(e.target.value)}
                        onFocus={() => setFocusField('name')} onBlur={() => setFocusField(null)} />
                    </div>
                  </div>
                )}

                <div className={`fiq-field ${focusField === 'email' ? 'focused' : ''}`}>
                  <label className="fiq-label" htmlFor="field-email">Work Email</label>
                  <div className="fiq-input-wrap">
                    <Mail size={15} className="fiq-field-icon" />
                    <input id="field-email" type="email" className="fiq-input" value={email}
                      placeholder="admin@forensiq.com" required onChange={e => setEmail(e.target.value)}
                      onFocus={() => setFocusField('email')} onBlur={() => setFocusField(null)} />
                  </div>
                </div>

                <div className={`fiq-field ${focusField === 'password' ? 'focused' : ''}`}>
                  <label className="fiq-label" htmlFor="field-password">Password</label>
                  <div className="fiq-input-wrap">
                    <Lock size={15} className="fiq-field-icon" />
                    <input id="field-password" type={showPassword ? 'text' : 'password'}
                      className="fiq-input" value={password} placeholder="••••••••••" required
                      onChange={e => setPassword(e.target.value)}
                      onFocus={() => setFocusField('password')} onBlur={() => setFocusField(null)} />
                    <button type="button" className="fiq-toggle-pw"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}>
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <button id="btn-submit-auth" type="submit" className="fiq-btn-cta" disabled={loading}>
                  {loading ? (
                    <div className="fiq-loading-dots"><span /><span /><span /></div>
                  ) : (
                    <>
                      <span>{mode === 'login' ? 'Access Workspace' : 'Create Account'}</span>
                      <ArrowRight size={16} className="fiq-arrow-icon" />
                    </>
                  )}
                </button>
              </form>

              {/* Demo */}
              <div className="fiq-demo-section">
                <div className="fiq-demo-info">
                  <span>Demo Access</span>
                  <span>admin@forensiq.com · admin123</span>
                </div>
                <button id="btn-demo-fill" type="button" className="fiq-demo-btn" onClick={fillDemo}>
                  <Zap size={13} /><span>Auto Fill</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <footer className="fiq-footer">
          © 2026 ForensIQ Security Suite · Final Year Project · All rights reserved
        </footer>
      </div>
    </>
  )
}