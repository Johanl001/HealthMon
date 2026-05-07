'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  User,
  History,
  BarChart3,
  Bot,
  Activity,
} from 'lucide-react'

const NAV = [
  { href: '/',           label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/profile',    label: 'Patient Profile', icon: User },
  { href: '/history',    label: 'Health History', icon: History },
  { href: '/analytics',  label: 'Analytics',    icon: BarChart3 },
  { href: '/assistant',  label: 'AI Assistant', icon: Bot },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [patient, setPatient] = useState<{ name: string; photo: string } | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem('healthMonProfile')
    if (raw) {
      const p = JSON.parse(raw)
      setPatient({ name: p.name || 'Patient', photo: p.photo || '' })
    }
    // Re-read on storage changes (e.g. after saving profile)
    const handler = () => {
      const r = localStorage.getItem('healthMonProfile')
      if (r) { const p = JSON.parse(r); setPatient({ name: p.name || 'Patient', photo: p.photo || '' }) }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 min-h-screen bg-[#0a0e1a] border-r border-border/40 py-6 px-3 sticky top-0 h-screen">
        {/* Logo */}
        <div className="flex items-center gap-3 px-3 mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-cyan-700 flex items-center justify-center shadow-lg shadow-primary/20">
            <Activity className="w-5 h-5 text-background" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground leading-tight">HealthMon</p>
            <p className="text-[10px] text-muted-foreground">Clinical Dashboard</p>
          </div>
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-2 px-3 mb-6">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </div>
          <span className="text-xs text-muted-foreground">Live data stream</span>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-1 flex-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-primary/15 text-primary border border-primary/25 shadow-sm shadow-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-primary' : ''}`} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Patient card at bottom */}
        <Link href="/profile" className="px-3 mt-6 block group">
          <div className="glass-card rounded-xl p-3 flex items-center gap-3 hover:border-primary/40 transition border border-border/30">
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              {patient?.photo
                ? <img src={patient.photo} alt="patient" className="w-full h-full object-cover" />
                : <User className="w-4 h-4 text-primary" />}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{patient?.name || 'Set up profile'}</p>
              <p className="text-[10px] text-primary/70">View Profile →</p>
            </div>
          </div>
        </Link>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0a0e1a]/95 backdrop-blur-md border-t border-border/40 flex justify-around py-2 px-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon className="w-5 h-5" />
              {label.split(' ')[0]}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
