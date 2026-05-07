'use client'

import { useState, useEffect } from 'react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid
} from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface HistoryEntry {
  ts: string
  temp: number
  pulse: number
  spo2: number
  status: string
}

// Normalize values to 0-100 scale for radar chart
function normalize(value: number, min: number, max: number) {
  return Math.round(Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100)))
}

function GaugeBar({ value, min, max, label, unit, color }: {
  value: number; min: number; max: number; label: string; unit: string; color: string
}) {
  const pct = Math.min(Math.max(((value - min) / (max - min)) * 100, 0), 100)
  return (
    <div className="glass-card rounded-xl p-5 border border-border/40">
      <div className="flex items-end justify-between mb-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground">{value}<span className="text-xs text-muted-foreground ml-1">{unit}</span></p>
      </div>
      <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
        <span>{min}</span><span>{max}{unit}</span>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
    const raw = localStorage.getItem('healthHistory')
    if (raw) setHistory(JSON.parse(raw))
  }, [])

  if (!hydrated) return null

  const last = history.at(-1)
  const temp  = last?.temp  ?? 36.8
  const pulse = last?.pulse ?? 72
  const spo2  = last?.spo2  ?? 98

  const radarData = [
    { metric: 'Temp',  value: normalize(temp,  35, 42) },
    { metric: 'Pulse', value: normalize(pulse, 30, 160) },
    { metric: 'SpO2',  value: normalize(spo2,  80, 100) },
    { metric: 'NEWS2', value: 0 }, // Will stay 0 if not available
  ]

  // Trend analysis (last 5)
  function calcTrend(key: keyof HistoryEntry) {
    if (history.length < 3) return 'stable'
    const vals = history.slice(-5).map(d => Number(d[key]))
    const delta = vals[vals.length - 1] - vals[0]
    if (delta > 0.5) return 'Increasing'
    if (delta < -0.5) return 'Decreasing'
    return 'Stable'
  }

  const trends = [
    { label: 'Temperature', t: calcTrend('temp'),  color: '#00d4ff' },
    { label: 'Pulse',       t: calcTrend('pulse'), color: '#ff3b5c' },
    { label: 'SpO2',        t: calcTrend('spo2'),  color: '#28c76f' },
  ]

  // Area chart data (last 15 readings)
  const areaData = history.slice(-15).map(e => ({
    time: new Date(e.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    Temp: e.temp,
    Pulse: e.pulse,
    SpO2: e.spo2,
  }))

  return (
    <div className="min-h-screen bg-background text-foreground grid-pattern">
      <div className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <h1 className="text-lg font-bold text-foreground">Analytics</h1>
          <p className="text-xs text-muted-foreground">Advanced vitals visualization</p>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {history.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 border border-border/30 text-center">
            <p className="text-muted-foreground text-sm">No data available yet. Return to Dashboard to start recording.</p>
          </div>
        ) : (
          <>
            {/* Gauge Bars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <GaugeBar label="Temperature" value={temp}  min={35} max={42}  unit="°C"  color="linear-gradient(90deg,#00d4ff,#ff3b5c)" />
              <GaugeBar label="Pulse Rate"  value={pulse} min={30} max={160} unit=" bpm" color="linear-gradient(90deg,#28c76f,#ff3b5c)" />
              <GaugeBar label="SpO2"        value={spo2}  min={80} max={100} unit="%"   color="linear-gradient(90deg,#ff3b5c,#28c76f)" />
            </div>

            {/* Trend Summary */}
            <div className="glass-card rounded-2xl p-6 border border-border/40">
              <h3 className="text-sm font-semibold text-foreground mb-4">Trend Analysis</h3>
              <div className="grid grid-cols-3 gap-4">
                {trends.map(({ label, t, color }) => (
                  <div key={label} className="text-center">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2" style={{ background: color + '20', border: `1px solid ${color}30` }}>
                      {t === 'Increasing' ? <TrendingUp className="w-5 h-5" style={{ color }} /> :
                       t === 'Decreasing' ? <TrendingDown className="w-5 h-5" style={{ color }} /> :
                       <Minus className="w-5 h-5 text-muted-foreground" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-sm font-semibold text-foreground">{t}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Radar Chart */}
            <div className="glass-card rounded-2xl p-6 border border-border/40">
              <h3 className="text-sm font-semibold text-foreground mb-4">Vitals Radar (Normalized 0-100)</h3>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData} cx="50%" cy="50%">
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <Radar name="Vitals" dataKey="value" stroke="#00d4ff" fill="#00d4ff" fillOpacity={0.2} strokeWidth={2} />
                  <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 8 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Area Chart */}
            <div className="glass-card rounded-2xl p-6 border border-border/40">
              <h3 className="text-sm font-semibold text-foreground mb-4">Historical Overview (Last 15 Readings)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={areaData}>
                  <defs>
                    <linearGradient id="gTemp"  x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} /><stop offset="95%" stopColor="#00d4ff" stopOpacity={0} /></linearGradient>
                    <linearGradient id="gPulse" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ff3b5c" stopOpacity={0.3} /><stop offset="95%" stopColor="#ff3b5c" stopOpacity={0} /></linearGradient>
                    <linearGradient id="gSpo2"  x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#28c76f" stopOpacity={0.3} /><stop offset="95%" stopColor="#28c76f" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 8 }} />
                  <Area type="monotone" dataKey="Temp"  stroke="#00d4ff" fill="url(#gTemp)"  strokeWidth={2} />
                  <Area type="monotone" dataKey="Pulse" stroke="#ff3b5c" fill="url(#gPulse)" strokeWidth={2} />
                  <Area type="monotone" dataKey="SpO2"  stroke="#28c76f" fill="url(#gSpo2)"  strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
