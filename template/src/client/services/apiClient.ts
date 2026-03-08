import { hc } from 'hono/client'
import type { AppType } from '@server/index'
import type { ApiSuccess, ApiError, ApiResponse } from '@shared/schemas'
import { WSClientImpl } from '@client/services/wsClient'

export type { ApiSuccess, ApiError, ApiResponse }
export { isSuccess, isError, getErrorMessage } from '@shared/utils/type-guards'

const baseUrl = import.meta.env.API_BASE_URL || window.location.origin

export const apiClient = hc<AppType>(baseUrl, {
  webSocket: url => new WSClientImpl(url),
})
