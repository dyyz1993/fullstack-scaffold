import { Inbox } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: LucideIcon
  action?: React.ReactNode
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 text-gray-500 ${className}`}
      data-testid="empty-state"
    >
      <Icon className="w-16 h-16 mb-4 text-gray-300" />
      <p className="text-center font-medium">{title}</p>
      {description && (
        <p className="text-sm text-gray-400 mt-2 text-center max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
