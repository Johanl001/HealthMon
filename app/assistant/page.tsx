'use client'

import { useState, useEffect, useRef } from 'react'
import { Bot, AlertTriangle, Send } from 'lucide-react'

interface Message {
  role: 'user' | 'ai'
  content: string
  ts: string
}

interface Vitals {
  temperature: number
  pulse: number
  spo2: number
  weight: number
  status: string
  newsScore: number
}

const QUICK = [
  { label: '🔍 Explain alert',       text: 'Please explain the current health alert in simple terms.' },
  { label: '⚠️ Is this dangerous?',  text: 'Are the current vitals dangerous? Should I be worried?' },
  { label: '🏠 What should I do?',   text: 'What home care actions should the patient take right now?' },
  { label: '📊 Explain NEWS2 score', text: 'Explain the current NEWS2 score and what it means.' },
  { label: '🩺 Doctor needed?',      text: 'Does the patient need to see a doctor or go to the ER?' },
]

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [vitals, setVitals] = useState<Vitals | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [alertDismissed, setAlertDismissed] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setHydrated(true)
    // Load last known vitals from localStorage history
    const raw = localStorage.getItem('healthHistory')
    if (raw) {
      const history = JSON.parse(raw)
      const last = history.at(-1)
      if (last) {
        setVitals({
          temperature: last.temp,
          pulse: last.pulse,
          spo2: last.spo2,
          weight: 70,
          status: last.status,
          newsScore: 0,
        })
      }
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Auto-trigger on CRITICAL
  useEffect(() => {
    if (!vitals || alertDismissed) return
    if (vitals.status === 'CRITICAL' && messages.length === 0) {
      setMessages([{
        role: 'ai',
        content: `⚠️ Critical alert detected — Status: ${vitals.status}, Temp: ${vitals.temperature}°C, Pulse: ${vitals.pulse} BPM, SpO2: ${vitals.spo2}%. Would you like me to explain this alert and what to do?`,
        ts: new Date().toLocaleTimeString(),
      }])
    }
  }, [vitals, alertDismissed])

  const sendMessage = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg: Message = { role: 'user', content: trimmed, ts: new Date().toLocaleTimeString() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          vitals: vitals ?? { temperature: 36.8, pulse: 72, spo2: 98, weight: 70, status: 'NORMAL', newsScore: 0 },
        }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, {
        role: 'ai',
        content: res.ok ? data.reply : (data.error ?? 'Sorry, an error occurred.'),
        ts: new Date().toLocaleTimeString(),
      }])
    } catch {
      setMessages(prev => [...prev, { role: 'ai', content: 'Network error. Please check your connection.', ts: new Date().toLocaleTimeString() }])
    } finally {
      setLoading(false)
    }
  }

  if (!hydrated) return null

  const isCritical = vitals?.status === 'CRITICAL'

  return (
    <div className="min-h-screen bg-background text-foreground grid-pattern flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground leading-tight">AI Clinical Assistant</h1>
            <p className="text-xs text-muted-foreground">
              {vitals
                ? `Vitals loaded — Temp ${vitals.temperature}°C · Pulse ${vitals.pulse} BPM · SpO2 ${vitals.spo2}% · ${vitals.status}`
                : 'No vitals loaded — go to Dashboard first'}
            </p>
          </div>
          <div className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-4">
        {/* CRITICAL Banner */}
        {isCritical && !alertDismissed && (
          <div className="glass-card rounded-xl p-4 border border-destructive/50 bg-destructive/10 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 animate-pulse flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-destructive">Critical Vitals Detected</p>
              <p className="text-xs text-muted-foreground mt-0.5">Ask the AI for immediate guidance.</p>
            </div>
            <button onClick={() => setAlertDismissed(true)} className="text-xs text-muted-foreground hover:text-foreground">Dismiss</button>
          </div>
        )}

        {/* Quick Prompts */}
        <div className="flex flex-wrap gap-2">
          {QUICK.map(({ label, text }) => (
            <button
              key={label}
              onClick={() => sendMessage(text)}
              disabled={loading}
              className="text-xs px-3 py-1.5 rounded-full border border-primary/25 bg-primary/10 text-primary hover:bg-primary/20 transition disabled:opacity-50"
            >
              {label}
            </button>
          ))}
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto glass-card rounded-2xl border border-border/30 p-4 space-y-4" style={{ minHeight: '340px', maxHeight: '50vh' }}>
          {messages.length === 0 && (
            <div className="h-full flex items-center justify-center">
              <p className="text-sm text-muted-foreground text-center">Ask me anything about the patient's vitals or health status.</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[82%]">
                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-accent/15 text-foreground border border-border/40 rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>
                <p className={`text-[10px] text-muted-foreground mt-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>{msg.ts}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm px-4 py-3 text-sm bg-accent/15 border border-border/40 text-muted-foreground italic">
                <span className="inline-flex items-center gap-1.5">
                  <span className="animate-pulse">●</span>
                  <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>●</span>
                  <span className="animate-pulse" style={{ animationDelay: '0.4s' }}>●</span>
                  <span className="ml-1">Analyzing vitals...</span>
                </span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
            disabled={loading}
            placeholder="Ask about the patient's health..."
            className="flex-1 rounded-xl px-4 py-3 text-sm bg-background/60 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="px-5 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </main>
    </div>
  )
}
