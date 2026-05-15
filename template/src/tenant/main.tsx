import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import '../client/index.css'
import { setupApiRequestDeps } from '@shared/core/api-request'
import { useTenantStore } from './stores/tenantStore'
import { message } from 'antd'

setupApiRequestDeps({
  loadingStore: useTenantStore.getState(),
  messageApi: message,
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
