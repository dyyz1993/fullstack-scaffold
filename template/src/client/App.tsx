import { BrowserRouter } from 'react-router-dom'
// 直接从文件导入而非 @client/components 桶文件：桶文件由 CLI 生成器按 preset
// 裁剪（src/generators/client-components-index.ts），ErrorBoundary 是全 preset
// 兜底组件，不参与裁剪
import { ErrorBoundary } from './components/ErrorBoundary'
import { AppRoutes } from './AppRoutes'

export const App: React.FC<{ presetId?: string }> = ({ presetId = 'todo' }) => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AppRoutes presetId={presetId} />
      </ErrorBoundary>
    </BrowserRouter>
  )
}
