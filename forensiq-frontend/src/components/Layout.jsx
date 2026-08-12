import { useState } from 'react'
import Sidebar from './Sidebar'
import Navbar from './Navbar'

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-row font-sans antialiased">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Navbar onOpenMobileMenu={() => setMobileOpen(true)} />

        <main className="flex-1 p-5 sm:p-7 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>

        <footer className="border-t border-slate-200/80 bg-white py-4 px-6 text-center text-xs font-medium text-slate-400">
          ForensIQ Security Suite v2.0 — AI-Powered Social Media Forensic Intelligence
        </footer>
      </div>
    </div>
  )
}
