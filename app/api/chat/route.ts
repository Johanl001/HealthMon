import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { message, vitals } = body as {
      message: string
      vitals: {
        temperature: number
        pulse: number
        spo2: number
        weight: number
        status: string
        newsScore: number
      }
    }

    if (!message || !vitals) {
      return NextResponse.json({ error: 'Missing message or vitals' }, { status: 400 })
    }

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    const systemPrompt = `You are a clinical AI assistant in a wearable IoT health monitor. 
Patient vitals: Temp=${vitals.temperature}°C, Pulse=${vitals.pulse}BPM, SpO2=${vitals.spo2}%, Weight=${vitals.weight}kg, 
Status=${vitals.status}, NEWS2 Score=${vitals.newsScore}/20. 
Give clear simple advice a non-doctor understands. Reference actual numbers. 
For score 0-2 reassure, 3-6 recommend doctor, 7+ recommend emergency.
Suggest practical home actions. Keep under 120 words. Never diagnose.`

    // Fallback list — if a model is rate-limited or down, try the next
    const FREE_MODELS = [
      'google/gemma-4-26b-a4b-it:free',              // Primary: Gemma 4 26B
      'meta-llama/llama-3.3-70b-instruct:free',      // Fallback 1: Llama 3.3 70B
      'openai/gpt-oss-20b:free',                     // Fallback 2: OpenAI OSS 20B
      'openai/gpt-oss-120b:free',                    // Fallback 3: OpenAI OSS 120B
      'qwen/qwen3-coder:free',                       // Fallback 4: Qwen3 Coder
      'nvidia/nemotron-nano-9b-v2:free',             // Fallback 5: Nvidia Nemotron
      'openrouter/free',                             // Last resort: auto-route to any free model
    ]

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ]

    let reply = 'No response received.'
    let succeeded = false

    for (const model of FREE_MODELS) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': siteUrl,
          'X-Title': 'HealthMon',
        },
        body: JSON.stringify({ model, messages }),
      })

      if (!response.ok) {
        const err = await response.text()
        let code: number | undefined
        try { code = JSON.parse(err)?.error?.code } catch { /* ignore */ }
        console.warn(`OpenRouter [${model}] failed (${code}), trying next...`)
        if (code === 429 || code === 404 || code === 400 || code === 502 || code === 503) continue // skip to next model
        // Unknown error — bail immediately
        console.error('OpenRouter API error:', err)
        return NextResponse.json({ error: 'AI service error' }, { status: 500 })
      }

      const data = await response.json()
      reply = data?.choices?.[0]?.message?.content ?? 'No response received.'
      succeeded = true
      console.log(`OpenRouter: responded using [${model}]`)
      break
    }

    if (!succeeded) {
      console.error('OpenRouter: all models are rate-limited or unavailable.')
      return NextResponse.json({ error: 'All AI models are currently rate-limited. Please try again in a moment.' }, { status: 503 })
    }

    return NextResponse.json({ reply })
  } catch (error) {
    console.error('Chat route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
