'use client'

import { useState, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import { Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface HistoryEntry {
  ts: string
  temp: number
  pulse: number
  spo2: number
  status: string
}

function trend(data: HistoryEntry[], key: keyof HistoryEntry) {
  if (data.length < 3) return 'stable'
  const recent = data.slice(-3).map(d => Number(d[key]))
  const first = recent[0], last = recent[2]
  if (last - first > 0.3) return 'up'
  if (first - last > 0.3) return 'down'
  return 'stable'
}

const STATUS_COLOR: Record<string, string> = {
  NORMAL: '#28c76f',
  WARNING: '#ffc857',
  CRITICAL: '#ff3b5c',
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
    const raw = localStorage.getItem('healthHistory')
    if (raw) setHistory(JSON.parse(raw))
  }, [])

  const clearHistory = () => {
    localStorage.removeItem('healthHistory')
    setHistory([])
  }

  if (!hydrated) return null

  const chartData = history.slice(-20).map(e => ({
    time: new Date(e.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    Temp: e.temp,
    Pulse: e.pulse,
    SpO2: e.spo2,
  }))

  const tempTrend  = trend(history, 'temp')
  const pulseTrend = trend(history, 'pulse')

  const TrendIcon = ({ t }: { t: string }) =>
    t === 'up' ? <TrendingUp className="w-4 h-4 text-destructive" /> :
    t === 'down' ? <TrendingDown className="w-4 h-4 text-primary" /> :
    <Minus className="w-4 h-4 text-muted-foreground" />

  return (
    <div className="min-h-screen bg-background text-foreground grid-pattern">
      <div className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">Health History</h1>
            <p className="text-xs text-muted-foreground">{history.length} readings stored</p>
          </div>
          {history.length > 0 && (
            <button onClick={clearHistory} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition px-3 py-1.5 rounded-xl border border-border/40 hover:border-destructive/30">
              <Trash2 className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {history.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 border border-border/30 text-center">
            <p className="text-muted-foreground text-sm">No history recorded yet.</p>
            <p className="text-muted-foreground text-xs mt-1">Readings appear here once your device starts sending data via ThingSpeak (or Demo Mode).</p>
          </div>
        ) : (
          <>
            {/* Trend Summary */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Temperature', value: `${history.at(-1)?.temp.toFixed(1)}°C`, t: tempTrend },
                { label: 'Pulse', value: `${history.at(-1)?.pulse} bpm`, t: pulseTrend },
                { label: 'SpO2', value: `${history.at(-1)?.spo2}%`, t: trend(history, 'spo2') },
              ].map(({ label, value, t }) => (
                <div key={label} className="glass-card rounded-xl p-4 border border-border/40">
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <p className="text-lg font-bold text-foreground">{value}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendIcon t={t} />
                    <span className="text-xs text-muted-foreground capitalize">{t === 'up' ? 'Increasing' : t === 'down' ? 'Decreasing' : 'Stable'}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Temperature Chart */}
            <div className="glass-card rounded-2xl p-6 border border-border/40">
              <h3 className="text-sm font-semibold text-foreground mb-4">Temperature vs Time</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#94a3b8' }} unit="°C" />
                  <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 8 }} />
                  <Line type="monotone" dataKey="Temp" stroke="#00d4ff" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Pulse + SpO2 Chart */}
            <div className="glass-card rounded-2xl p-6 border border-border/40">
              <h3 className="text-sm font-semibold text-foreground mb-4">Pulse & SpO2 vs Time</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="Pulse" stroke="#ff3b5c" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="SpO2" stroke="#28c76f" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Data Table */}
            <div className="glass-card rounded-2xl border border-border/40 overflow-hidden">
              <div className="px-6 py-4 border-b border-border/40">
                <h3 className="text-sm font-semibold text-foreground">Recent Readings</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30">
                      {['Time', 'Temperature', 'Pulse', 'SpO2', 'Status'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...history].reverse().slice(0, 20).map((e, i) => (
                      <tr key={i} className="border-b border-border/20 hover:bg-white/3 transition-colors">
                        <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(e.ts).toLocaleString()}</td>
                        <td className="px-4 py-3 text-foreground">{e.temp.toFixed(1)}°C</td>
                        <td className="px-4 py-3 text-foreground">{e.pulse === 0 ? '—' : `${e.pulse} bpm`}</td>
                        <td className="px-4 py-3 text-foreground">{e.spo2 === 0 ? '—' : `${e.spo2}%`}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ color: STATUS_COLOR[e.status] || '#94a3b8', background: (STATUS_COLOR[e.status] || '#94a3b8') + '20' }}>
                            {e.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
