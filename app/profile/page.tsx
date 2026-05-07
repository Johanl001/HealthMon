'use client'

import { useState, useEffect, useRef } from 'react'
import { User, Save, Edit3, Heart, Wind, Droplets, Pill, Camera } from 'lucide-react'

const DEFAULTS = {
  name: '',
  age: 30,
  gender: 'Male',
  weight: 70,
  height: 175,
  disease: 'None',
  notes: '',
  photo: '', // base64 data URL
}

const DISEASES = ['None', 'Heart', 'Asthma', 'Diabetes', 'Hypertension', 'COPD']
const GENDERS  = ['Male', 'Female', 'Other']

const DISEASE_ICONS: Record<string, any> = {
  Heart: Heart,
  Asthma: Wind,
  Diabetes: Droplets,
  Hypertension: Pill,
  COPD: Wind,
}

export default function ProfilePage() {
  const [profile, setProfile] = useState(DEFAULTS)
  const [editing, setEditing] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [saved, setSaved] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      setProfile(p => ({ ...p, photo: base64 }))
    }
    reader.readAsDataURL(file)
  }

  useEffect(() => {
    setHydrated(true)
    const stored = localStorage.getItem('healthMonProfile')
    if (stored) setProfile(JSON.parse(stored))
    // Also sync from settings modal if exists
    const settingsRaw = localStorage.getItem('healthMonSettings')
    if (settingsRaw) {
      const s = JSON.parse(settingsRaw)
      setProfile(prev => ({
        ...prev,
        age: s.age ?? prev.age,
        weight: s.weight ?? prev.weight,
        disease: s.disease ?? prev.disease,
      }))
    }
  }, [])

  const handleSave = () => {
    localStorage.setItem('healthMonProfile', JSON.stringify(profile))
    // Also sync back to settings
    const settingsRaw = localStorage.getItem('healthMonSettings')
    const settings = settingsRaw ? JSON.parse(settingsRaw) : {}
    localStorage.setItem('healthMonSettings', JSON.stringify({
      ...settings,
      age: profile.age,
      weight: profile.weight,
      disease: profile.disease,
    }))
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const bmi = profile.weight / ((profile.height / 100) ** 2)
  const bmiLabel = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese'
  const bmiColor = bmi < 18.5 ? '#ffc857' : bmi < 25 ? '#28c76f' : bmi < 30 ? '#ffc857' : '#ff3b5c'
  const DiseaseIcon = DISEASE_ICONS[profile.disease] ?? User

  if (!hydrated) return null

  return (
    <div className="min-h-screen bg-background text-foreground grid-pattern">
      {/* Page header */}
      <div className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">Patient Profile</h1>
            <p className="text-xs text-muted-foreground">Medical information & preferences</p>
          </div>
          <div className="flex gap-2">
            {editing ? (
              <>
                <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-sm rounded-xl border border-border/50 text-muted-foreground hover:bg-white/5 transition">Cancel</button>
                <button onClick={handleSave} className="px-4 py-1.5 text-sm rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition flex items-center gap-1.5">
                  <Save className="w-3.5 h-3.5" /> Save
                </button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className="px-4 py-1.5 text-sm rounded-xl border border-primary/30 text-primary hover:bg-primary/10 transition flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5" /> Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {saved && (
          <div className="p-3 rounded-xl bg-green-500/15 border border-green-500/30 text-green-400 text-sm text-center">
            ✓ Profile saved successfully
          </div>
        )}

        {/* Summary Card */}
        <div className="glass-card rounded-2xl p-6 border border-primary/20">
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/30 flex items-center justify-center">
                {profile.photo
                  ? <img src={profile.photo} alt="Patient" className="w-full h-full object-cover" />
                  : <User className="w-9 h-9 text-primary" />}
              </div>
              {editing && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-primary flex items-center justify-center border-2 border-background hover:opacity-90 transition shadow-lg"
                >
                  <Camera className="w-3.5 h-3.5 text-primary-foreground" />
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>

            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground">{profile.name || 'Patient'}</h2>
              <p className="text-muted-foreground text-sm">{profile.age} yrs · {profile.gender} · {profile.weight} kg · {profile.height} cm</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary">
                  BMI {bmi.toFixed(1)} — <span style={{ color: bmiColor }}>{bmiLabel}</span>
                </span>
                {profile.disease !== 'None' && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-1">
                    <DiseaseIcon className="w-3 h-3" /> {profile.disease}
                  </span>
                )}
              </div>
            </div>
          </div>
          {editing && (
            <p className="text-xs text-muted-foreground mt-4 text-center">Click the <Camera className="w-3 h-3 inline" /> icon on the avatar to upload a photo</p>
          )}
        </div>

        {/* Edit Form */}
        <div className="glass-card rounded-2xl p-6 border border-border/40">
          <h3 className="text-sm font-semibold text-foreground mb-5 uppercase tracking-wider text-muted-foreground">Personal Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Full Name', key: 'name', type: 'text', placeholder: 'Optional' },
              { label: 'Age', key: 'age', type: 'number', placeholder: '30' },
              { label: 'Weight (kg)', key: 'weight', type: 'number', placeholder: '70' },
              { label: 'Height (cm)', key: 'height', type: 'number', placeholder: '175' },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                {editing ? (
                  <input
                    type={type}
                    value={(profile as any)[key]}
                    onChange={e => setProfile(p => ({ ...p, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))}
                    placeholder={placeholder}
                    className="w-full rounded-xl px-3 py-2 text-sm bg-background border border-border/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                ) : (
                  <p className="text-sm text-foreground py-2 px-3 rounded-xl bg-white/5 border border-border/30">{(profile as any)[key] || '—'}</p>
                )}
              </div>
            ))}

            {/* Gender */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Gender</label>
              {editing ? (
                <select
                  value={profile.gender}
                  onChange={e => setProfile(p => ({ ...p, gender: e.target.value }))}
                  className="w-full rounded-xl px-3 py-2 text-sm bg-background border border-border/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {GENDERS.map(g => <option key={g}>{g}</option>)}
                </select>
              ) : (
                <p className="text-sm text-foreground py-2 px-3 rounded-xl bg-white/5 border border-border/30">{profile.gender}</p>
              )}
            </div>

            {/* Known Condition */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Known Condition</label>
              {editing ? (
                <select
                  value={profile.disease}
                  onChange={e => setProfile(p => ({ ...p, disease: e.target.value }))}
                  className="w-full rounded-xl px-3 py-2 text-sm bg-background border border-border/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {DISEASES.map(d => <option key={d}>{d}</option>)}
                </select>
              ) : (
                <p className="text-sm text-foreground py-2 px-3 rounded-xl bg-white/5 border border-border/30">{profile.disease}</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="mt-4">
            <label className="text-xs text-muted-foreground mb-1 block">Clinical Notes</label>
            {editing ? (
              <textarea
                rows={3}
                value={profile.notes}
                onChange={e => setProfile(p => ({ ...p, notes: e.target.value }))}
                placeholder="Any additional notes for the physician..."
                className="w-full rounded-xl px-3 py-2 text-sm bg-background border border-border/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            ) : (
              <p className="text-sm text-foreground py-2 px-3 rounded-xl bg-white/5 border border-border/30 min-h-[60px]">{profile.notes || '—'}</p>
            )}
          </div>
        </div>

        {/* BMI Gauge */}
        <div className="glass-card rounded-2xl p-6 border border-border/40">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">BMI Analysis</h3>
          <div className="flex items-end gap-4">
            <div>
              <p className="text-5xl font-bold" style={{ color: bmiColor }}>{bmi.toFixed(1)}</p>
              <p className="text-sm font-medium mt-1" style={{ color: bmiColor }}>{bmiLabel}</p>
            </div>
            <div className="flex-1">
              <div className="relative h-3 rounded-full overflow-hidden bg-white/10">
                <div className="absolute inset-y-0 left-0 w-[25%] bg-gradient-to-r from-[#3b82f6] to-[#22c55e] rounded-full opacity-70" />
                <div className="absolute inset-y-0 left-[25%] w-[25%] bg-gradient-to-r from-[#22c55e] to-[#ffc857] opacity-70" />
                <div className="absolute inset-y-0 left-[50%] w-[25%] bg-gradient-to-r from-[#ffc857] to-[#ff3b5c] opacity-70" />
                <div className="absolute inset-y-0 left-[75%] w-[25%] bg-[#ff3b5c] opacity-70 rounded-r-full" />
                {/* Marker */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white bg-foreground shadow-lg"
                  style={{ left: `${Math.min(Math.max(((bmi - 15) / 25) * 100, 0), 97)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>15</span><span>Underweight</span><span>Normal</span><span>Overweight</span><span>Obese</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
