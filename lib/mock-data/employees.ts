import type { Employee, User } from '@/lib/types'

export const mockEmployees: Employee[] = [
  {
    id: '1',
    employeeId: 'EMP-001',
    name: 'John Smith',
    email: 'john.smith@company.com',
    phone: '+1 (555) 111-2222',
    role: 'admin',
    department: 'Management',
    position: 'Operations Manager',
    status: 'active',
    hireDate: '2020-03-15',
    salary: 85000,
    createdAt: '2020-03-15T09:00:00Z'
  },
  {
    id: '2',
    employeeId: 'EMP-002',
    name: 'Emily Johnson',
    email: 'emily.johnson@company.com',
    phone: '+1 (555) 222-3333',
    role: 'employee',
    department: 'Sales',
    position: 'Sales Representative',
    status: 'active',
    hireDate: '2021-06-01',
    salary: 55000,
    createdAt: '2021-06-01T09:00:00Z'
  },
  {
    id: '3',
    employeeId: 'EMP-003',
    name: 'Michael Chen',
    email: 'michael.chen@company.com',
    phone: '+1 (555) 333-4444',
    role: 'employee',
    department: 'Warehouse',
    position: 'Inventory Specialist',
    status: 'active',
    hireDate: '2022-01-10',
    salary: 48000,
    createdAt: '2022-01-10T09:00:00Z'
  },
  {
    id: '4',
    employeeId: 'EMP-004',
    name: 'Sarah Williams',
    email: 'sarah.williams@company.com',
    phone: '+1 (555) 444-5555',
    role: 'admin',
    department: 'Finance',
    position: 'Finance Director',
    status: 'active',
    hireDate: '2019-08-20',
    salary: 95000,
    createdAt: '2019-08-20T09:00:00Z'
  },
  {
    id: '5',
    employeeId: 'EMP-005',
    name: 'David Brown',
    email: 'david.brown@company.com',
    phone: '+1 (555) 555-6666',
    role: 'employee',
    department: 'Sales',
    position: 'Account Manager',
    status: 'active',
    hireDate: '2022-04-15',
    salary: 62000,
    createdAt: '2022-04-15T09:00:00Z'
  },
  {
    id: '6',
    employeeId: 'EMP-006',
    name: 'Lisa Martinez',
    email: 'lisa.martinez@company.com',
    phone: '+1 (555) 666-7777',
    role: 'employee',
    department: 'Warehouse',
    position: 'Shipping Coordinator',
    status: 'on_leave',
    hireDate: '2021-09-01',
    salary: 45000,
    createdAt: '2021-09-01T09:00:00Z'
  },
  {
    id: '7',
    employeeId: 'EMP-007',
    name: 'James Wilson',
    email: 'james.wilson@company.com',
    phone: '+1 (555) 777-8888',
    role: 'employee',
    department: 'Customer Service',
    position: 'Support Specialist',
    status: 'active',
    hireDate: '2023-02-01',
    salary: 42000,
    createdAt: '2023-02-01T09:00:00Z'
  },
  {
    id: '8',
    employeeId: 'EMP-008',
    name: 'Jennifer Lee',
    email: 'jennifer.lee@company.com',
    phone: '+1 (555) 888-9999',
    role: 'employee',
    department: 'Sales',
    position: 'Sales Associate',
    status: 'inactive',
    hireDate: '2020-11-15',
    salary: 50000,
    createdAt: '2020-11-15T09:00:00Z'
  }
]

// Mock users for authentication
export const mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@company.com',
    name: 'John Smith',
    role: 'admin',
    avatar: '/placeholder.svg?height=32&width=32',
    department: 'Management',
    createdAt: '2020-03-15T09:00:00Z'
  },
  {
    id: '2',
    email: 'employee@company.com',
    name: 'Emily Johnson',
    role: 'employee',
    avatar: '/placeholder.svg?height=32&width=32',
    department: 'Sales',
    createdAt: '2021-06-01T09:00:00Z'
  },
  {
    id: '3',
    email: 'inventory@company.com',
    name: 'Michael Chen',
    role: 'inventory_manager',
    avatar: '/placeholder.svg?height=32&width=32',
    department: 'Warehouse',
    createdAt: '2022-01-10T09:00:00Z'
  }
]

// Mock credentials for login
export const mockCredentials = {
  admin: {
    email: 'admin@company.com',
    password: 'admin123'
  },
  employee: {
    email: 'employee@company.com',
    password: 'employee123'
  },
  inventory_manager: {
    email: 'inventory@company.com',
    password: 'inventory123'
  }
}
