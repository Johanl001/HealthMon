'use client'

import { useState, useEffect } from 'react'
import StatusBanner from '@/components/StatusBanner'
import MetricCard from '@/components/MetricCard'
import DetailPage from '@/components/DetailPage'
import RecommendationsSection from '@/components/RecommendationsSection'
import SettingsModal from '@/components/SettingsModal'
import AIChatbot from '@/components/AIChatbot'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'

// ─── NEWS2 Score Calculation ──────────────────────────────────────────────
function calculateNEWS2(temp: number, pulse: number, spo2: number): { score: number } {
  let score = 0

  // Temperature
  if (temp <= 35) score += 3
  else if (temp <= 36) score += 1
  else if (temp <= 38) score += 0
  else if (temp <= 39) score += 1
  else score += 2

  // Pulse
  if (pulse <= 40) score += 3
  else if (pulse <= 50) score += 1
  else if (pulse <= 90) score += 0
  else if (pulse <= 110) score += 1
  else if (pulse <= 130) score += 2
  else score += 3

  // SpO2 (skip if spo2 === 0)
  if (spo2 > 0) {
    if (spo2 >= 96) score += 0
    else if (spo2 >= 94) score += 1
    else if (spo2 >= 92) score += 2
    else score += 3
  }

  return { score }
}

export default function Home() {
  const [activeTab, setActiveTab] = useState('overview')
  const [newsScore, setNewsScore] = useState(0)
  const [hydrated, setHydrated] = useState(false)
  const [patient, setPatient] = useState<{ name: string; photo: string } | null>(null)

  const [settings, setSettings] = useState({
    age: 30,
    weight: 70,
    disease: 'None',
    channelId: '',
    readKey: '',
    demoMode: false
  })

  const [metrics, setMetrics] = useState({
    temperature: 36.8,
    pulse: 72,
    weight: 70,
    bmi: 24.5,
    spo2: 98,
    status: 'NORMAL' as 'NORMAL' | 'WARNING' | 'CRITICAL',
    reason: 'Waiting for live data...',
    suggestion: 'Please configure API settings or enable Demo Mode.',
    lastUpdate: '--:--:--',
  })

  // Sparkline history (last 10 readings)
  const [sparkTemp, setSparkTemp] = useState<{ v: number }[]>([])
  const [sparkPulse, setSparkPulse] = useState<{ v: number }[]>([])
  const [sparkSpo2, setSparkSpo2] = useState<{ v: number }[]>([])

  // Load settings + patient profile on mount
  useEffect(() => {
    setHydrated(true)
    const saved = localStorage.getItem('healthMonSettings')
    if (saved) setSettings(JSON.parse(saved))
    // Load patient profile
    const profileRaw = localStorage.getItem('healthMonProfile')
    if (profileRaw) {
      const p = JSON.parse(profileRaw)
      setPatient({ name: p.name || '', photo: p.photo || '' })
    }
    // Keep patient in sync if profile is saved while on dashboard
    const onStorage = () => {
      const r = localStorage.getItem('healthMonProfile')
      if (r) { const p = JSON.parse(r); setPatient({ name: p.name || '', photo: p.photo || '' }) }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const handleSaveSettings = (newSettings: any) => {
    setSettings(newSettings)
    localStorage.setItem('healthMonSettings', JSON.stringify(newSettings))
  }

  // Health Logic Evaluation
  const evaluateHealth = (temp: number, pulse: number, spo2: number, currentSettings: typeof settings) => {
    let severity = 0 // 0: Normal, 1: Warning, 2: Critical
    const reasons: string[] = []
    const suggestions: string[] = []

    // 1. Temperature Base Logic
    if (temp < 36 || temp > 39) {
      severity = Math.max(severity, 2)
      reasons.push(`Temperature is critical (${temp}°C).`)
      suggestions.push(temp > 39 ? "Seek medical attention, apply cool compress." : "Warm up and monitor temperature.")
    } else if (temp >= 37.5 && temp <= 39) {
      severity = Math.max(severity, 1)
      reasons.push("Temperature is elevated.")
      suggestions.push("Stay hydrated and rest.")
    }

    // 2. Pulse Base Logic
    if (pulse < 45 || pulse > 120) {
      severity = Math.max(severity, 2)
      reasons.push(`Pulse rate is critical (${pulse} BPM).`)
      suggestions.push("Seek immediate medical help.")
    } else if (pulse >= 100 && pulse <= 120) {
      severity = Math.max(severity, 1)
      reasons.push("Pulse rate is high.")
      suggestions.push("Sit calmly and relax.")
    }

    // 3. SpO2 Simple Logic
    if (spo2 > 0 && spo2 < 90) {
      severity = Math.max(severity, 2)
      reasons.push("Blood oxygen is critically low.")
      suggestions.push("Breathe deeply, seek medical attention.")
    }

    // 4. Modifiers
    if (currentSettings.age > 50 && severity > 0 && severity < 2) {
      severity++
      reasons.push("Age modifier applied (increased severity).")
    }

    if (currentSettings.disease === 'Heart' && pulse > 100) {
      severity = 2
      reasons.push("Heart condition combined with high pulse.")
      suggestions.push("Take prescribed heart medication and call a doctor immediately.")
    }

    let status: 'NORMAL' | 'WARNING' | 'CRITICAL' = 'NORMAL'
    if (severity === 1) status = 'WARNING'
    if (severity === 2) status = 'CRITICAL'

    return {
      status,
      reason: reasons.length > 0 ? reasons.join(' ') : 'All vitals are within normal ranges.',
      suggestion: suggestions.length > 0 ? suggestions.join(' ') : 'Keep up the good work! Stay healthy.'
    }
  }

  // Fetch ThingSpeak Data
  useEffect(() => {
    if (!hydrated || !settings.channelId || !settings.readKey || settings.demoMode) return

    const fetchThingSpeak = async () => {
      try {
        const res = await fetch(`https://api.thingspeak.com/channels/${settings.channelId}/feeds/last.json?api_key=${settings.readKey}`)
        if (!res.ok) throw new Error('API Error')
        const data = await res.json()

        const temp = parseFloat(data.field1) || 0
        const pulse = parseInt(data.field2) || 0
        const spo2 = parseInt(data.field3) || 0   // field3 → SpO2
        const news2Raw = parseInt(data.field4) || 0  // field4 → NEWS2 raw score from device
        const weight = settings.weight || 70          // weight comes from settings, not ThingSpeak

        // BMI uses weight from settings
        const calcWeight = weight
        const heightMeters = 1.75 // Default height for BMI estimation
        const bmi = calcWeight > 0 ? calcWeight / (heightMeters * heightMeters) : 0

        const health = evaluateHealth(temp, pulse, spo2, settings)
        const { score } = calculateNEWS2(temp, pulse, spo2)
        setNewsScore(score)

        setMetrics({
          temperature: temp,
          pulse: pulse,
          weight: calcWeight,
          bmi: bmi,
          spo2: spo2,
          status: health.status,
          reason: health.reason,
          suggestion: health.suggestion,
          lastUpdate: new Date(data.created_at).toLocaleTimeString()
        })

        // Update sparklines
        setSparkTemp(prev => [...prev.slice(-9), { v: temp }])
        setSparkPulse(prev => [...prev.slice(-9), { v: pulse }])
        setSparkSpo2(prev => [...prev.slice(-9), { v: spo2 }])

        // Persist to history in localStorage
        const entry = { ts: new Date().toISOString(), temp, pulse, spo2, status: health.status }
        const saved = JSON.parse(localStorage.getItem('healthHistory') || '[]')
        localStorage.setItem('healthHistory', JSON.stringify([...saved.slice(-99), entry]))

      } catch (err) {
        console.error('Failed to fetch from ThingSpeak', err)
      }
    }

    fetchThingSpeak() // Initial fetch
    const interval = setInterval(fetchThingSpeak, 12000) // 12s interval
    return () => clearInterval(interval)
  }, [hydrated, settings])

  // Demo Triggers
  const triggerDemo = (scenario: string) => {
    let t = 36.8, p = 72, s = 98;
    if (scenario === 'normal') { t = 36.8; p = 72; s = 98; }
    if (scenario === 'highTemp') { t = 39.5; p = 85; s = 97; }
    if (scenario === 'highPulse') { t = 37.0; p = 125; s = 96; }
    if (scenario === 'lowSpo2') { t = 36.5; p = 90; s = 85; }
    if (scenario === 'heartDisease') { t = 37.2; p = 105; s = 95; } // If disease is 'Heart', this will trigger CRITICAL

    const health = evaluateHealth(t, p, s, settings)
    const { score } = calculateNEWS2(t, p, s)
    setNewsScore(score)

    setMetrics({
      temperature: t,
      pulse: p,
      weight: settings.weight || 70,
      bmi: (settings.weight || 70) / (1.75 * 1.75),
      spo2: s,
      status: health.status,
      reason: health.reason,
      suggestion: health.suggestion,
      lastUpdate: new Date().toLocaleTimeString() + ' (DEMO)'
    })
  }

  if (!hydrated) return null

  // NEWS2 color scale
  const news2Color = newsScore >= 7 ? '#ff3b5c' : newsScore >= 3 ? '#ffc857' : '#28c76f'
  const news2Label = newsScore >= 7 ? 'High Risk' : newsScore >= 3 ? 'Medium Risk' : 'Low Risk'
  const news2Pct = Math.min((newsScore / 20) * 100, 100)

  return (
    <div className="min-h-screen bg-background text-foreground grid-pattern">
      {/* Top bar */}
      <div className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">Dashboard</h1>
            <p className="text-xs text-muted-foreground">Real-time patient vitals</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
              Live
            </div>

            {/* Patient identity pill */}
            {(patient?.name || patient?.photo) && (
              <a href="/profile" className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-border/40 bg-white/5 hover:bg-white/10 hover:border-primary/30 transition-all group">
                <div className="w-7 h-7 rounded-lg overflow-hidden border border-primary/25 bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {patient.photo
                    ? <img src={patient.photo} alt={patient.name} className="w-full h-full object-cover" />
                    : <span className="text-[11px] font-bold text-primary">{patient.name.charAt(0).toUpperCase()}</span>}
                </div>
                {patient.name && (
                  <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors max-w-[100px] truncate hidden sm:block">{patient.name}</span>
                )}
              </a>
            )}

            <SettingsModal initialSettings={settings} onSave={handleSaveSettings} />
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {settings.demoMode && (
          <div className="mb-6 p-4 rounded-lg bg-primary/10 border border-primary/30 flex flex-wrap gap-2 items-center">
            <span className="font-semibold text-primary mr-2">Demo Controls:</span>
            <button onClick={() => triggerDemo('normal')} className="px-3 py-1 text-sm bg-background border rounded hover:bg-accent/20">Normal</button>
            <button onClick={() => triggerDemo('highTemp')} className="px-3 py-1 text-sm bg-background border rounded hover:bg-destructive/20 text-destructive">Critical Temp</button>
            <button onClick={() => triggerDemo('highPulse')} className="px-3 py-1 text-sm bg-background border rounded hover:bg-destructive/20 text-destructive">Critical Pulse</button>
            <button onClick={() => triggerDemo('lowSpo2')} className="px-3 py-1 text-sm bg-background border rounded hover:bg-destructive/20 text-destructive">Low SpO2</button>
            <button onClick={() => triggerDemo('heartDisease')} className="px-3 py-1 text-sm bg-background border rounded hover:bg-yellow-500/20 text-yellow-500">Heart Condition (High Pulse)</button>
          </div>
        )}

        <StatusBanner
          status={metrics.status}
          reason={metrics.reason}
          suggestion={metrics.suggestion}
          lastUpdate={metrics.lastUpdate}
        />

        {activeTab === 'overview' && (
          <div className="space-y-6">

            {/* Live Metrics Grid with sparklines */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Temperature */}
              <div
                onClick={() => setActiveTab('temperature')}
                className={`glass-card p-4 rounded-xl border cursor-pointer hover:scale-105 transition-all ${metrics.temperature > 37.5 || metrics.temperature < 36
                  ? 'border-destructive/40 bg-destructive/5' : 'border-primary/20'
                  }`}
              >
                <p className="text-xs text-muted-foreground mb-1">Temperature</p>
                <p className="text-2xl font-bold text-foreground">{metrics.temperature.toFixed(1)}<span className="text-sm font-normal text-muted-foreground ml-1">°C</span></p>
                <div className="mt-2 h-10">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sparkTemp}>
                      <Line type="monotone" dataKey="v" stroke="#00d4ff" strokeWidth={1.5} dot={false} />
                      <Tooltip contentStyle={{ background: '#0a0f1e', border: 'none', fontSize: '10px' }} formatter={(v: any) => [`${v}°C`, 'Temp']} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Pulse */}
              <div
                onClick={() => setActiveTab('pulse')}
                className={`glass-card p-4 rounded-xl border cursor-pointer hover:scale-105 transition-all ${metrics.pulse > 100 || (metrics.pulse > 0 && metrics.pulse < 50)
                  ? 'border-destructive/40 bg-destructive/5'
                  : metrics.pulse === 0 ? 'border-border/30' : 'border-primary/20'
                  }`}
              >
                <p className="text-xs text-muted-foreground mb-1">Pulse Rate</p>
                <p className="text-2xl font-bold text-foreground">
                  {metrics.pulse === 0 ? <span className="text-sm text-muted-foreground">No Sensor</span> : <>{metrics.pulse}<span className="text-sm font-normal text-muted-foreground ml-1">bpm</span></>}
                </p>
                <div className="mt-2 h-10">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sparkPulse}>
                      <Line type="monotone" dataKey="v" stroke="#ff3b5c" strokeWidth={1.5} dot={false} />
                      <Tooltip contentStyle={{ background: '#0a0f1e', border: 'none', fontSize: '10px' }} formatter={(v: any) => [`${v}bpm`, 'Pulse']} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* SpO2 */}
              <div
                onClick={() => setActiveTab('spo2')}
                className={`glass-card p-4 rounded-xl border cursor-pointer hover:scale-105 transition-all ${metrics.spo2 > 0 && metrics.spo2 < 95
                  ? 'border-yellow-400/40 bg-yellow-400/5' : 'border-primary/20'
                  }`}
              >
                <p className="text-xs text-muted-foreground mb-1">SpO2</p>
                <p className="text-2xl font-bold text-foreground">
                  {metrics.spo2 === 0 ? <span className="text-sm text-muted-foreground">No Sensor</span> : <>{metrics.spo2}<span className="text-sm font-normal text-muted-foreground ml-1">%</span></>}
                </p>
                <div className="mt-2 h-10">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sparkSpo2}>
                      <Line type="monotone" dataKey="v" stroke="#28c76f" strokeWidth={1.5} dot={false} />
                      <Tooltip contentStyle={{ background: '#0a0f1e', border: 'none', fontSize: '10px' }} formatter={(v: any) => [`${v}%`, 'SpO2']} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* NEWS2 Score Panel */}
              <div className="glass-card p-4 rounded-xl border border-primary/20">
                <p className="text-xs text-muted-foreground mb-1">NEWS2 Score</p>
                <p className="text-2xl font-bold" style={{ color: news2Color }}>{newsScore}<span className="text-sm font-normal text-muted-foreground ml-1">/20</span></p>
                <div className="mt-3">
                  <div className="w-full bg-white/10 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${news2Pct}%`, background: news2Color }}></div>
                  </div>
                  <p className="text-[10px] mt-1 font-medium" style={{ color: news2Color }}>{news2Label}</p>
                </div>
              </div>
            </div>

            {/* Personalized Health Strategy Info Cards */}
            <RecommendationsSection
              status={metrics.status}
              temperature={metrics.temperature}
              pulse={metrics.pulse}
              spo2={metrics.spo2}
              disease={settings.disease}
            />

            {/* Quick link to AI Assistant */}
            <div className="glass-card rounded-2xl p-5 border border-border/50 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">AI Clinical Assistant</p>
                <p className="text-xs text-muted-foreground">Get instant advice based on current vitals</p>
              </div>
              <a href="/assistant" className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition">
                Open Assistant →
              </a>
            </div>
          </div>
        )}

        {activeTab !== 'overview' && (
          <button
            onClick={() => setActiveTab('overview')}
            className="mb-6 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-opacity-90 transition-colors"
          >
            ← Back to Overview
          </button>
        )}

        {activeTab === 'temperature' && <DetailPage type="temperature" value={metrics.temperature} />}
        {activeTab === 'pulse' && <DetailPage type="pulse" value={metrics.pulse} />}
        {activeTab === 'weight' && <DetailPage type="weight" value={metrics.weight} />}
        {activeTab === 'spo2' && <DetailPage type="bmi" value={metrics.bmi} />} {/* Reuse BMI detail page structure for simplicity, or we could add spo2. Let's map it to BMI for now to preserve existing UI */}
      </main>
    </div>
  )
}
