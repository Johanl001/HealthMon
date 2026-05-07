'use client'

import { useState, useRef, useEffect } from 'react'

interface Vitals {
  temperature: number
  pulse: number
  spo2: number
  weight: number
  status: string
  newsScore: number
}

interface Message {
  role: 'user' | 'ai'
  content: string
}

const QUICK_PROMPTS = [
  'Is the patient stable?',
  'Deterioration risk?',
  'Home remedies',
  'Should I see a doctor?',
  'Explain NEWS2 score',
]

export default function AIChatbot({ vitals }: { vitals: Vitals }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ai',
      content: `Hello! I'm your AI Clinical Assistant. I can see the current vitals — Temp: ${vitals.temperature}°C, Pulse: ${vitals.pulse} BPM, SpO2: ${vitals.spo2}%, NEWS2: ${vitals.newsScore}/20. How can I help you today?`,
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMessage: Message = { role: 'user', content: trimmed }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, vitals }),
      })

      const data = await res.json()
      const aiMessage: Message = {
        role: 'ai',
        content: res.ok
          ? data.reply
          : (data.error ?? 'Sorry, I encountered an error. Please try again.'),
      }
      setMessages((prev) => [...prev, aiMessage])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'ai', content: 'Network error. Please check your connection.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleQuickPrompt = (prompt: string) => {
    sendMessage(prompt)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') sendMessage(input)
  }

  return (
    <div className="glass-card rounded-2xl p-6 border border-border/50 bg-background/60 backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
        </div>
        <h2 className="text-lg font-semibold text-foreground tracking-tight">AI Clinical Assistant</h2>
        <span className="ml-auto text-xs text-muted-foreground px-2 py-0.5 rounded-full border border-border/40 bg-primary/5">
          NEWS2: {vitals.newsScore}/20
        </span>
      </div>

      {/* Quick Prompts */}
      <div className="flex flex-wrap gap-2 mb-4">
        {QUICK_PROMPTS.map((p) => (
          <button
            key={p}
            disabled={loading}
            onClick={() => handleQuickPrompt(p)}
            className="text-xs px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Message Area */}
      <div
        className="overflow-y-auto rounded-xl bg-background/40 border border-border/30 p-4 mb-4 space-y-3 flex flex-col"
        style={{ height: '300px' }}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-accent/20 text-foreground border border-border/40 rounded-bl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm bg-accent/20 border border-border/40 text-muted-foreground italic">
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

      {/* Input Row */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          placeholder="Ask about the patient's health..."
          className="flex-1 rounded-xl px-4 py-2.5 text-sm bg-background/60 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition disabled:opacity-50"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>
    </div>
  )
}
