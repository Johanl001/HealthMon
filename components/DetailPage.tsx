'use client'

import { useEffect, useState } from 'react'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface DetailPageProps {
  type: 'temperature' | 'pulse' | 'weight' | 'bmi'
  value: number
}

export default function DetailPage({ type, value }: DetailPageProps) {
  const [data, setData] = useState<Array<{ time: string; value: number }>>([])

  const details = {
    temperature: {
      title: 'Temperature Analysis',
      normal: '36.5°C - 37.5°C',
      current: value.toFixed(1) + '°C',
      description: 'Core body temperature is a critical indicator of metabolic function.',
      recommendations: [
        'Maintain hydration levels throughout the day',
        'Avoid extreme environmental temperatures',
        'Monitor for fever symptoms if reading is elevated',
        'Record temperature at consistent times daily',
      ],
      status: value > 37.5 ? 'Elevated' : 'Normal',
    },
    pulse: {
      title: 'Pulse Rate Analysis',
      normal: '60 - 100 bpm',
      current: value + ' bpm',
      description: 'Heart rate reflects cardiovascular health and stress levels.',
      recommendations: [
        'Maintain regular exercise routine',
        'Practice stress-reduction techniques',
        'Ensure adequate rest and recovery',
        'Avoid excessive caffeine intake',
      ],
      status: value > 100 ? 'Elevated' : 'Normal',
    },
    weight: {
      title: 'Weight Tracking',
      normal: 'Varies by individual',
      current: value.toFixed(1) + ' kg',
      description: 'Consistent weight monitoring helps track overall health trends.',
      recommendations: [
        'Weigh yourself at the same time daily',
        'Use consistent measurement equipment',
        'Track weight trends over weeks, not daily',
        'Combine with BMI and body composition data',
      ],
      status: 'Normal',
    },
    bmi: {
      title: 'BMI Analysis',
      normal: '18.5 - 24.9 kg/m²',
      current: value.toFixed(1) + ' kg/m²',
      description: 'Body Mass Index is a screening tool for weight categories.',
      recommendations: [
        'Combine BMI with other health metrics',
        'Maintain balanced nutrition',
        'Engage in regular physical activity',
        'Consult healthcare provider for personalized guidance',
      ],
      status: value > 25 ? 'Overweight' : 'Normal',
    },
  }

  const detail = details[type]

  useEffect(() => {
    // Generate historical data
    const newData = []
    for (let i = 23; i >= 0; i--) {
      const time = `${23 - i}:00`
      const variance = Math.sin(i * 0.5) * (value * 0.05)
      newData.push({
        time,
        value: Math.round((value + variance) * 10) / 10,
      })
    }
    setData(newData)
  }, [value])

  return (
    <div className="space-y-8">
      {/* Header Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-6 rounded-xl border border-primary/30">
          <h3 className="text-sm text-muted-foreground mb-2">Current Value</h3>
          <p className="text-3xl font-bold text-primary">{detail.current}</p>
        </div>
        <div className="glass-card p-6 rounded-xl border border-accent/30">
          <h3 className="text-sm text-muted-foreground mb-2">Normal Range</h3>
          <p className="text-3xl font-bold text-foreground">{detail.normal}</p>
        </div>
        <div className="glass-card p-6 rounded-xl border border-yellow-400/30">
          <h3 className="text-sm text-muted-foreground mb-2">Status</h3>
          <p className="text-3xl font-bold text-yellow-400">{detail.status}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="glass-card p-6 rounded-xl border border-primary/30">
        <h2 className="text-lg font-semibold text-foreground mb-6">24-Hour Trend</h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 212, 255, 0.1)" />
            <XAxis dataKey="time" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#111827',
                border: '1px solid rgba(0, 212, 255, 0.3)',
                borderRadius: '8px',
                color: '#e0e8ff',
              }}
            />
            <Area type="monotone" dataKey="value" stroke="#00d4ff" fillOpacity={1} fill="url(#colorValue)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Description and Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6 rounded-xl border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">About {detail.title}</h3>
          <p className="text-muted-foreground leading-relaxed">{detail.description}</p>
        </div>
        <div className="glass-card p-6 rounded-xl border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">Recommendations</h3>
          <ul className="space-y-2">
            {detail.recommendations.map((rec, idx) => (
              <li key={idx} className="flex gap-3 text-muted-foreground text-sm">
                <span className="text-primary font-bold">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Home Remedies */}
      <div className="glass-card p-6 rounded-xl border border-primary/30">
        <h3 className="text-lg font-semibold text-foreground mb-4">Health Tips & Remedies</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
            <h4 className="font-semibold text-primary mb-2">Immediate Care</h4>
            <p className="text-sm text-muted-foreground">
              {type === 'temperature' && 'Stay hydrated and rest in a cool environment.'}
              {type === 'pulse' && 'Take deep breaths and practice relaxation techniques.'}
              {type === 'weight' && 'Focus on consistent daily routines and balanced meals.'}
              {type === 'bmi' && 'Increase physical activity and monitor caloric intake.'}
            </p>
          </div>
          <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
            <h4 className="font-semibold text-primary mb-2">Long-term Strategy</h4>
            <p className="text-sm text-muted-foreground">
              {type === 'temperature' && 'Maintain healthy lifestyle and monitor regularly.'}
              {type === 'pulse' && 'Build cardiovascular endurance through regular exercise.'}
              {type === 'weight' && 'Establish sustainable eating and exercise habits.'}
              {type === 'bmi' && 'Combine diet, exercise, and medical consultation.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
