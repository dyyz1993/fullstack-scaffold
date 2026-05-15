import { Navigate } from 'react-router-dom'
import { useMerchantStore } from '../stores/merchantStore'

interface MerchantGuardProps {
  children: React.ReactNode
}

export const MerchantGuard: React.FC<MerchantGuardProps> = ({ children }) => {
  const { isAuthenticated, user } = useMerchantStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!user || user.role !== 'merchant') {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
