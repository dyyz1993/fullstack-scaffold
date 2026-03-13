import { useState } from 'react'
import { PermissionGuard } from '../components/PermissionGuard'
import { Permission } from '@shared/modules/admin'

interface User {
  id: number
  name: string
  email: string
  role: string
}

export const UsersPage: React.FC = () => {
  const [users] = useState<User[]>([
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User' },
    { id: 3, name: 'Bob Wilson', email: 'bob@example.com', role: 'User' },
  ])

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Users Management</h1>
        <PermissionGuard permission={Permission.USER_CREATE}>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            Add User
          </button>
        </PermissionGuard>
      </div>
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map(user => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">{user.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">{user.role}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <PermissionGuard permission={Permission.USER_EDIT}>
                    <button className="text-blue-600 hover:text-blue-800 mr-3">Edit</button>
                  </PermissionGuard>
                  <PermissionGuard permission={Permission.USER_DELETE}>
                    <button className="text-red-600 hover:text-red-800">Delete</button>
                  </PermissionGuard>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
