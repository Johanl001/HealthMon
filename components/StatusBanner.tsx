import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface StatusBannerProps {
  status: 'NORMAL' | 'WARNING' | 'CRITICAL'
  reason: string
  suggestion: string
  lastUpdate: string
}

export default function StatusBanner({ status, reason, suggestion, lastUpdate }: StatusBannerProps) {
  let bgColor = 'bg-accent/10 border-accent/30'
  let Icon = CheckCircle2
  let iconColor = 'text-primary'
  let title = 'All Systems Nominal'

  if (status === 'WARNING') {
    bgColor = 'bg-yellow-500/10 border-yellow-500/50 bg-yellow-500/20'
    Icon = AlertTriangle
    iconColor = 'text-yellow-500'
    title = 'Health Warning'
  } else if (status === 'CRITICAL') {
    bgColor = 'bg-destructive/20 border-destructive/50 animate-pulse-soft'
    Icon = AlertCircle
    iconColor = 'text-destructive animate-pulse'
    title = 'Critical Alert'
  }

  return (
    <div className={`mb-8 p-4 rounded-lg border flex items-start gap-4 transition-colors duration-300 ${bgColor}`}>
      <div className="flex-shrink-0 mt-0.5">
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
      <div className="flex-1">
        <h2 className={`font-semibold text-lg ${status === 'CRITICAL' ? 'text-destructive' : status === 'WARNING' ? 'text-yellow-500' : 'text-foreground'}`}>
          {title} <span className="text-sm font-normal text-muted-foreground ml-2">Last update: {lastUpdate}</span>
        </h2>
        <div className="mt-2 space-y-1">
          <p className="text-sm text-foreground">
            <span className="font-medium">Reason:</span> {reason}
          </p>
          <p className="text-sm text-foreground">
            <span className="font-medium">Suggestion:</span> {suggestion}
          </p>
        </div>
      </div>
    </div>
  )
}
