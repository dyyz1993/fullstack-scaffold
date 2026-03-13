import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Headphones,
  FileText,
  AlertTriangle,
  Settings,
  Shield,
  type LucideIcon,
} from 'lucide-react'
import { Permission } from '@shared/modules/admin'

export interface MenuItem {
  path: string
  label: string
  icon: LucideIcon
  permissions: Permission[]
}

export const MENU_CONFIG: MenuItem[] = [
  {
    path: '/dashboard',
    label: '仪表盘',
    icon: LayoutDashboard,
    permissions: [],
  },
  {
    path: '/users',
    label: '用户管理',
    icon: Users,
    permissions: [Permission.USER_VIEW],
  },
  {
    path: '/orders',
    label: '订单管理',
    icon: ShoppingCart,
    permissions: [Permission.ORDER_VIEW],
  },
  {
    path: '/tickets',
    label: '客服中心',
    icon: Headphones,
    permissions: [Permission.TICKET_VIEW],
  },
  {
    path: '/disputes',
    label: '争议处理',
    icon: AlertTriangle,
    permissions: [Permission.TICKET_VIEW],
  },
  {
    path: '/content',
    label: '内容管理',
    icon: FileText,
    permissions: [Permission.CONTENT_VIEW],
  },
  {
    path: '/settings',
    label: '系统设置',
    icon: Settings,
    permissions: [Permission.SYSTEM_SETTINGS],
  },
  {
    path: '/permissions',
    label: '权限管理',
    icon: Shield,
    permissions: [],
  },
]
