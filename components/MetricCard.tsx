import { Zap } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string | number
  unit: string
  status: 'normal' | 'high' | 'warning'
  onClick?: () => void
  className?: string
}

export default function MetricCard({
  title,
  value,
  unit,
  status,
  onClick,
  className = '',
}: MetricCardProps) {
  const statusColor = {
    normal: 'text-primary border-primary/30',
    high: 'text-destructive border-destructive/30',
    warning: 'text-yellow-400 border-yellow-400/30',
  }

  const statusBg = {
    normal: 'bg-primary/10',
    high: 'bg-destructive/10',
    warning: 'bg-yellow-400/10',
  }

  return (
    <div
      onClick={onClick}
      className={`glass-card p-6 rounded-xl border transition-all duration-300 ${statusColor[status]} ${statusBg[status]} ${className}`}
    >
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <Zap className="w-4 h-4 text-primary opacity-60" />
      </div>
      <div className="space-y-2">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-foreground">{value}</span>
          <span className="text-lg font-medium text-muted-foreground">{unit}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            status === 'normal' ? 'bg-primary' : status === 'high' ? 'bg-destructive' : 'bg-yellow-400'
          } animate-pulse-soft`}></div>
          <span className="text-xs text-muted-foreground capitalize">{status}</span>
        </div>
      </div>
    </div>
  )
}
