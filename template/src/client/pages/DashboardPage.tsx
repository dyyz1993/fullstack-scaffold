import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import {
  Users,
  UserCheck,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ChevronDown,
} from 'lucide-react'

interface StatCard {
  label: string
  value: string
  trend: number
  icon: React.FC<{ className?: string }>
}

const stats: StatCard[] = [
  { label: 'Total Users', value: '12,847', trend: 12.5, icon: Users },
  { label: 'Active Users', value: '8,234', trend: 8.2, icon: UserCheck },
  { label: 'Revenue', value: '$48,293', trend: -2.4, icon: DollarSign },
  { label: 'Conversion', value: '3.2%', trend: 4.1, icon: TrendingUp },
]

const revenueData = [
  { month: 'Jan', value: 65 },
  { month: 'Feb', value: 45 },
  { month: 'Mar', value: 78 },
  { month: 'Apr', value: 52 },
  { month: 'May', value: 90 },
  { month: 'Jun', value: 70 },
]

const userGrowthData = [
  { month: 'Jan', value: 30 },
  { month: 'Feb', value: 45 },
  { month: 'Mar', value: 55 },
  { month: 'Apr', value: 60 },
  { month: 'May', value: 72 },
  { month: 'Jun', value: 85 },
]

type ActivityStatus = 'Active' | 'Pending' | 'Inactive'

interface ActivityRow {
  id: number
  user: string
  action: string
  date: string
  status: ActivityStatus
}

const recentActivity: ActivityRow[] = [
  {
    id: 1,
    user: 'Sarah Chen',
    action: 'Upgraded to Pro plan',
    date: '2024-01-15',
    status: 'Active',
  },
  {
    id: 2,
    user: 'Mike Johnson',
    action: 'Submitted support ticket',
    date: '2024-01-14',
    status: 'Pending',
  },
  {
    id: 3,
    user: 'Emily Davis',
    action: 'Cancelled subscription',
    date: '2024-01-13',
    status: 'Inactive',
  },
  {
    id: 4,
    user: 'Alex Turner',
    action: 'Registered new account',
    date: '2024-01-12',
    status: 'Active',
  },
  {
    id: 5,
    user: 'Lisa Park',
    action: 'Updated billing info',
    date: '2024-01-11',
    status: 'Active',
  },
]

const statusStyles: Record<ActivityStatus, string> = {
  Active: 'bg-green-100 text-green-700',
  Pending: 'bg-yellow-100 text-yellow-700',
  Inactive: 'bg-gray-100 text-gray-600',
}

const timeRanges = ['Last 7 days', 'Last 30 days', 'Last 90 days', 'Last year']

export const DashboardPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState('Last 30 days')
  const [dropdownOpen, setDropdownOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8" data-testid="dashboard-page">
      <Helmet>
        <title>Dashboard - SaaS Admin</title>
        <meta name="description" content="SaaS Admin Dashboard" />
      </Helmet>

      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              data-testid="time-range-dropdown"
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {timeRange}
              <ChevronDown className="w-4 h-4" />
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                {timeRanges.map(range => (
                  <button
                    key={range}
                    onClick={() => {
                      setTimeRange(range)
                      setDropdownOpen(false)
                    }}
                    data-testid={`time-range-${range.toLowerCase().replace(/\s+/g, '-')}`}
                    className={`block w-full text-left px-4 py-2 text-sm transition-colors first:rounded-t-lg last:rounded-b-lg ${
                      range === timeRange
                        ? 'bg-gray-100 text-gray-900 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          {stats.map(stat => {
            const Icon = stat.icon
            const isPositive = stat.trend >= 0
            return (
              <div
                key={stat.label}
                data-testid={`stat-card-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}
                className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-500">{stat.label}</span>
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Icon className="w-4 h-4 text-gray-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
                <div className="flex items-center gap-1">
                  {isPositive ? (
                    <TrendingUp className="w-3 h-3 text-green-500" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-500" />
                  )}
                  <span
                    className={`text-sm font-medium ${
                      isPositive ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {isPositive ? '+' : ''}
                    {stat.trend}%
                  </span>
                  <span className="text-xs text-gray-400 ml-1">vs last period</span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-8">
          <div
            className="bg-white rounded-lg border border-gray-200 p-5 sm:p-6"
            data-testid="revenue-chart"
          >
            <h2 className="text-base font-semibold text-gray-900 mb-6">Revenue Overview</h2>
            <div className="flex items-end gap-3 h-48">
              {revenueData.map(item => (
                <div key={item.month} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex flex-col items-center">
                    <span className="text-xs text-gray-500 mb-1">${item.value}k</span>
                    <div
                      className="w-full rounded-t-md bg-gray-800 transition-all hover:bg-gray-700"
                      style={{ height: `${(item.value / 100) * 160}px` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{item.month}</span>
                </div>
              ))}
            </div>
          </div>

          <div
            className="bg-white rounded-lg border border-gray-200 p-5 sm:p-6"
            data-testid="user-growth-chart"
          >
            <h2 className="text-base font-semibold text-gray-900 mb-6">User Growth</h2>
            <div className="flex items-end gap-3 h-48">
              {userGrowthData.map(item => (
                <div key={item.month} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex flex-col items-center">
                    <span className="text-xs text-gray-500 mb-1">{item.value}%</span>
                    <div
                      className="w-full rounded-t-md transition-all"
                      style={{
                        height: `${(item.value / 100) * 160}px`,
                        background: `linear-gradient(to top, #1f2937 ${item.value}%, #e5e7eb ${item.value}%)`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{item.month}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          className="bg-white rounded-lg border border-gray-200 overflow-hidden"
          data-testid="recent-activity"
        >
          <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Recent Activity</h2>
            <button
              data-testid="view-all-activity"
              className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              View all
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 sm:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="text-left px-5 sm:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="text-left px-5 sm:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    Date
                  </th>
                  <th className="text-left px-5 sm:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map(activity => (
                  <tr
                    key={activity.id}
                    data-testid={`activity-row-${activity.id}`}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-5 sm:px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">{activity.user}</span>
                    </td>
                    <td className="px-5 sm:px-6 py-4">
                      <span className="text-sm text-gray-600">{activity.action}</span>
                    </td>
                    <td className="px-5 sm:px-6 py-4 hidden sm:table-cell">
                      <span className="text-sm text-gray-500">{activity.date}</span>
                    </td>
                    <td className="px-5 sm:px-6 py-4">
                      <span
                        data-testid={`status-badge-${activity.id}`}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${
                          statusStyles[activity.status]
                        }`}
                      >
                        {activity.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
