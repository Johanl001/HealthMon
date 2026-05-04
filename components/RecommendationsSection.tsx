import { AlertCircle, Lightbulb, Leaf, Activity, Utensils, ShieldCheck, Stethoscope } from 'lucide-react'

interface RecommendationsSectionProps {
  status: string
  temperature: number
  pulse: number
  spo2: number
  disease: string
}

export default function RecommendationsSection({ status, temperature, pulse, spo2, disease }: RecommendationsSectionProps) {
  const isWarning = status === 'WARNING'
  const isCritical = status === 'CRITICAL'

  // Dynamic Content Generators
  const getDietaryRoutine = () => {
    let diet = []
    if (disease === 'Heart') {
      diet.push("Low-sodium diet to manage blood pressure.")
      diet.push("Rich in Omega-3 fatty acids (salmon, walnuts, flaxseeds).")
    }
    if (disease === 'Asthma') {
      diet.push("Antioxidant-rich foods (apples, cantaloupe, carrots) to reduce lung inflammation.")
      diet.push("Avoid sulfites (found in wine, dried fruits) which can trigger symptoms.")
    }
    if (temperature > 37.5) {
      diet.push("Increase fluid intake (water, herbal teas, broths).")
      diet.push("Eat easily digestible foods like bananas, rice, applesauce, and toast (BRAT diet).")
    }
    if (pulse > 100) {
      diet.push("Limit caffeine and energy drinks.")
      diet.push("Magnesium-rich foods (spinach, almonds) to help regulate heart rhythm.")
    }
    if (diet.length === 0) {
      diet.push("Maintain a balanced diet rich in whole grains, lean proteins, and fresh vegetables.")
      diet.push("Stay hydrated by drinking at least 8 glasses of water daily.")
    }
    return diet
  }

  const getPreventiveMeasures = () => {
    let measures = []
    if (disease === 'Heart') {
      measures.push("Monitor blood pressure and pulse daily.")
      measures.push("Engage in light, regular cardiovascular exercises (walking, swimming).")
    }
    if (disease === 'Asthma') {
      measures.push("Use peak flow meter to monitor lung function.")
      measures.push("Avoid known allergens and cold, dry air environments.")
    }
    if (spo2 > 0 && spo2 < 95) {
      measures.push("Practice deep breathing exercises regularly (e.g., pursed-lip breathing).")
      measures.push("Ensure proper ventilation in your living space.")
    }
    if (measures.length === 0) {
      measures.push("Maintain a consistent 7-8 hour sleep schedule.")
      measures.push("Engage in 30 minutes of moderate exercise at least 5 days a week.")
    }
    return measures
  }

  const getCurativeMeasures = () => {
    let measures = []
    if (isCritical) {
      measures.push("IMMEDIATE ACTION: Seek emergency medical assistance.")
      if (disease === 'Heart' && pulse > 100) measures.push("Take prescribed emergency heart medication if advised by your doctor.")
      if (temperature > 39) measures.push("Apply cold compresses to forehead, neck, and underarms to reduce fever.")
      if (spo2 > 0 && spo2 < 90) measures.push("Use supplemental oxygen if prescribed; sit upright to ease breathing.")
    } else if (isWarning) {
      if (temperature > 37.5) measures.push("Rest in a cool, comfortable environment. Monitor temperature every 2 hours.")
      if (pulse > 100) measures.push("Sit in a quiet room, practice slow and deep breathing for 5 minutes.")
      if (pulse < 60) measures.push("Drink a warm beverage and walk slowly around the room to gently raise heart rate.")
      measures.push("Consult your primary care physician if symptoms persist for more than 24 hours.")
    } else {
      measures.push("No immediate curative actions required.")
      measures.push("Continue with your current healthy routines and prescribed maintenance medications.")
    }
    return measures
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Personalized Health Strategy</h2>
        <p className="text-muted-foreground">
          {isCritical ? 'CRITICAL ALERT: Please follow the emergency curative measures immediately.'
            : isWarning ? 'WARNING: Based on your current vitals, we recommend adjusting your routine.'
            : 'NORMAL: Your vitals are stable. Here are strategies to maintain your health.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Dietary Routine */}
        <div className={`glass-card p-6 rounded-xl border ${isWarning || isCritical ? 'border-yellow-500/30' : 'border-green-500/30'}`}>
          <div className="flex items-center gap-3 mb-4">
            <Utensils className="w-6 h-6 text-green-500" />
            <h3 className="text-lg font-semibold text-foreground">Dietary Routine</h3>
          </div>
          <ul className="space-y-3">
            {getDietaryRoutine().map((item, idx) => (
              <li key={idx} className="flex gap-3 text-sm text-muted-foreground">
                <span className="text-green-500 font-bold">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Preventive Measures */}
        <div className={`glass-card p-6 rounded-xl border ${isWarning || isCritical ? 'border-yellow-500/30' : 'border-blue-500/30'}`}>
          <div className="flex items-center gap-3 mb-4">
            <ShieldCheck className="w-6 h-6 text-blue-500" />
            <h3 className="text-lg font-semibold text-foreground">Preventive Measures</h3>
          </div>
          <ul className="space-y-3">
            {getPreventiveMeasures().map((item, idx) => (
              <li key={idx} className="flex gap-3 text-sm text-muted-foreground">
                <span className="text-blue-500 font-bold">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Curative Measures */}
        <div className={`glass-card p-6 rounded-xl border ${isCritical ? 'border-destructive/50 bg-destructive/5' : isWarning ? 'border-yellow-500/30' : 'border-primary/30'}`}>
          <div className="flex items-center gap-3 mb-4">
            <Stethoscope className={`w-6 h-6 ${isCritical ? 'text-destructive animate-pulse' : 'text-primary'}`} />
            <h3 className={`text-lg font-semibold ${isCritical ? 'text-destructive' : 'text-foreground'}`}>Curative Measures</h3>
          </div>
          <ul className="space-y-3">
            {getCurativeMeasures().map((item, idx) => (
              <li key={idx} className="flex gap-3 text-sm text-muted-foreground">
                <span className={`${isCritical ? 'text-destructive' : 'text-primary'} font-bold`}>•</span>
                <span className={isCritical && item.includes('IMMEDIATE') ? 'text-destructive font-semibold' : ''}>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
