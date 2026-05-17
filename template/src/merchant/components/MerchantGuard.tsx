import { Navigate } from 'react-router-dom'
import { useMerchantStore } from '../stores/merchantStore'

interface MerchantGuardProps {
  children: React.ReactNode
}

export const MerchantGuard: React.FC<MerchantGuardProps> = ({ children }) => {
  const { isAuthenticated, merchant } = useMerchantStore()

  if (!isAuthenticated || !merchant) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
