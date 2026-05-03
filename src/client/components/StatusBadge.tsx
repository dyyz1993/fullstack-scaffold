import type { LucideIcon } from 'lucide-react'

export type ColorScheme =
  | 'gray'
  | 'blue'
  | 'green'
  | 'red'
  | 'yellow'
  | 'purple'
  | 'orange'
  | 'cyan'
  | 'indigo'

interface StatusBadgeProps {
  label?: string
  status?: string
  icon?: LucideIcon
  colorScheme?: ColorScheme
  className?: string
}

const statusColorMap: Record<string, ColorScheme> = {
  active: 'green',
  inactive: 'gray',
  pending: 'yellow',
  suspended: 'red',
  cancelled: 'red',
  left: 'gray',
  trial: 'blue',
  expired: 'red',
  accepted: 'green',
  declined: 'red',
}

const colorMap: Record<ColorScheme, { bg: string; text: string }> = {
  gray: { bg: 'bg-gray-500', text: 'text-gray-500' },
  blue: { bg: 'bg-blue-500', text: 'text-blue-500' },
  green: { bg: 'bg-green-500', text: 'text-green-500' },
  red: { bg: 'bg-red-500', text: 'text-red-500' },
  yellow: { bg: 'bg-yellow-500', text: 'text-yellow-500' },
  purple: { bg: 'bg-purple-500', text: 'text-purple-500' },
  orange: { bg: 'bg-orange-500', text: 'text-orange-500' },
  cyan: { bg: 'bg-cyan-500', text: 'text-cyan-500' },
  indigo: { bg: 'bg-indigo-500', text: 'text-indigo-500' },
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  status,
  icon: Icon,
  colorScheme,
  className = '',
}) => {
  const displayLabel = label || status || ''
  const resolvedColorScheme = colorScheme || statusColorMap[status || ''] || 'gray'
  const colors = colorMap[resolvedColorScheme]

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-white ${colors.bg} ${className}`}
      data-testid="status-badge"
    >
      {Icon && <Icon className="w-3 h-3" />}
      {displayLabel}
    </span>
  )
}
