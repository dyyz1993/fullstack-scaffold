import { UserManagementPage } from '../components/UserManagementPage'

export const StaffPage: React.FC = () => (
  <UserManagementPage
    roleFilter="all"
    title="运营人员管理"
    entityLabel="运营人员"
    loadingText="加载运营人员列表..."
    allowSelfLock={false}
  />
)
