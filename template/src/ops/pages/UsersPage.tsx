import { UserManagementPage } from '../components/UserManagementPage'

export const UsersPage: React.FC = () => (
  <UserManagementPage
    roleFilter="user"
    title="用户管理"
    entityLabel="用户"
    loadingText="加载用户列表..."
  />
)
