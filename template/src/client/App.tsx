import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './AppRoutes'

export const App: React.FC<{ presetId?: string }> = ({ presetId = 'todo' }) => {
  return (
    <BrowserRouter>
      <AppRoutes presetId={presetId} />
    </BrowserRouter>
  )
}
