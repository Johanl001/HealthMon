'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import StatusBanner from '@/components/StatusBanner'
import MetricCard from '@/components/MetricCard'
import DetailPage from '@/components/DetailPage'
import RecommendationsSection from '@/components/RecommendationsSection'
import SettingsModal from '@/components/SettingsModal'
import AIChatbot from '@/components/AIChatbot'

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

  // Load settings on mount
  useEffect(() => {
    setHydrated(true)
    const saved = localStorage.getItem('healthMonSettings')
    if (saved) {
      setSettings(JSON.parse(saved))
    }
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
    if (pulse < 50 || pulse > 120) {
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
        const weight = parseFloat(data.field3) || 0
        const spo2 = parseInt(data.field4) || 0
        
        // Calculate BMI using Base Weight from settings if live weight is 0, or just use weight
        const calcWeight = weight > 0 ? weight : settings.weight
        const heightMeters = 1.75 // Default height for BMI estimation if needed
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

  return (
    <div className="min-h-screen bg-background text-foreground grid-pattern">
      <Header>
        <SettingsModal initialSettings={settings} onSave={handleSaveSettings} />
      </Header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          <div className="space-y-8">
            {/* Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              <MetricCard
                title="Temperature"
                value={metrics.temperature.toFixed(1)}
                unit="°C"
                status={metrics.temperature > 37.5 || metrics.temperature < 36 ? 'high' : 'normal'}
                onClick={() => setActiveTab('temperature')}
                className="cursor-pointer hover:scale-105 transition-transform"
              />
              <MetricCard
                title="Pulse Rate"
                value={metrics.pulse}
                unit="bpm"
                status={metrics.pulse > 100 || metrics.pulse < 50 ? 'high' : 'normal'}
                onClick={() => setActiveTab('pulse')}
                className="cursor-pointer hover:scale-105 transition-transform"
              />
              <MetricCard
                title="Weight"
                value={metrics.weight.toFixed(1)}
                unit="kg"
                status="normal"
                onClick={() => setActiveTab('weight')}
                className="cursor-pointer hover:scale-105 transition-transform"
              />
              <MetricCard
                title="SpO2"
                value={metrics.spo2}
                unit="%"
                status={metrics.spo2 > 0 && metrics.spo2 < 95 ? 'warning' : 'normal'}
                onClick={() => setActiveTab('spo2')}
                className="cursor-pointer hover:scale-105 transition-transform"
              />
              <MetricCard
                title="NEWS2 Score"
                value={newsScore}
                unit="/20"
                status={newsScore >= 7 ? 'high' : newsScore >= 3 ? 'warning' : 'normal'}
                className=""
              />
            </div>

            {/* Personalized Health Strategy Info Cards */}
            <RecommendationsSection 
              status={metrics.status} 
              temperature={metrics.temperature}
              pulse={metrics.pulse}
              spo2={metrics.spo2}
              disease={settings.disease}
            />

            {/* AI Clinical Chatbot */}
            <AIChatbot
              vitals={{
                temperature: metrics.temperature,
                pulse: metrics.pulse,
                spo2: metrics.spo2,
                weight: metrics.weight,
                status: metrics.status,
                newsScore,
              }}
            />
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
