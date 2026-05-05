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

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    const systemPrompt = `You are a clinical AI assistant in a wearable IoT health monitor. 
Patient vitals: Temp=${vitals.temperature}°C, Pulse=${vitals.pulse}BPM, SpO2=${vitals.spo2}%, Weight=${vitals.weight}kg, 
Status=${vitals.status}, NEWS2 Score=${vitals.newsScore}/20. 
Give clear simple advice a non-doctor understands. Reference actual numbers. 
For score 0-2 reassure, 3-6 recommend doctor, 7+ recommend emergency.
Suggest practical home actions. Keep under 120 words. Never diagnose.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 256,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: message,
          },
        ],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Anthropic API error:', err)
      return NextResponse.json({ error: 'AI service error' }, { status: 500 })
    }

    const data = await response.json()
    const reply = data?.content?.[0]?.text ?? 'No response received.'

    return NextResponse.json({ reply })
  } catch (error) {
    console.error('Chat route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
