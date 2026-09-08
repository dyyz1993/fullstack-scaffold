export { UserTable } from './UserTable'
export { StatsCard } from './StatsCard'
export { PageHeader } from './PageHeader'
export { UserFormModal } from './UserFormModal'
export { ProtectedRoute } from './ProtectedRoute'
export { PermissionGuard, PermissionButton, Can, Cannot } from './PermissionGuard'
// CaptchaModal is excluded by file-filter when captcha module is not in the preset.
// Re-export it here only if the file exists (it will be present when captcha module is included).
// The admin-app generator conditionally imports it only when hasCaptcha is true.
export { CaptchaModal } from './CaptchaModal'
