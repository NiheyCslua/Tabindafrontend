import { create } from 'zustand'
import type { Employee, CreateEmployeeDTO, UpdateEmployeeDTO, EmployeeStatus, UserRole } from '@/lib/types'
import { api, API_ENDPOINTS } from '@/lib/api'
import { asArray, asObject, toDateString, toLowerStatus, toNumber, toStringValue } from '@/lib/api-normalizers'

interface EmployeeFilters {
  search?: string
  status?: EmployeeStatus
}

interface EmployeeState {
  employees: Employee[]
  selectedEmployee: Employee | null
  filters: EmployeeFilters
  isLoading: boolean
  error: string | null

  fetchEmployees: () => Promise<void>
  getEmployeeById: (id: string) => Employee | undefined
  setSelectedEmployee: (employee: Employee | null) => void
  addEmployee: (employee: CreateEmployeeDTO) => Promise<Employee>
  createEmployee: (employee: CreateEmployeeDTO) => Promise<Employee>
  updateEmployee: (id: string, updates: UpdateEmployeeDTO) => Promise<Employee>
  deleteEmployee: (id: string) => Promise<void>
  setFilters: (filters: EmployeeFilters) => void
  clearFilters: () => void
}

const normalizeRole = (value: unknown): UserRole => {
  const role = toLowerStatus<UserRole>(value, 'no_app_access')
  if (role === 'admin' || role === 'sales' || role === 'inventory_manager') return role
  return 'no_app_access'
}

const normalizeStatus = (value: unknown): EmployeeStatus => {
  const status = toLowerStatus<EmployeeStatus>(value, 'active')
  if (status === 'inactive' || status === 'on_leave' || status === 'terminated') return status
  return 'active'
}

const normalizeEmployee = (payload: unknown): Employee => {
  const item = asObject<Record<string, any>>(payload)
  const baseSalary = toNumber(item.baseSalary ?? item.salary, 0)
  const hireDate = toDateString(item.hireDate ?? item.joiningDate ?? item.createdAt)

  return {
    id: toStringValue(item.id ?? item._id),
    employeeId: toStringValue(item.employeeId ?? item.id),
    name: toStringValue(item.name),
    email: toStringValue(item.email),
    phone: toStringValue(item.phone),
    password: item.password ? String(item.password) : undefined,
    role: normalizeRole(item.role),
    cnic: item.cnic ? String(item.cnic) : undefined,
    position: toStringValue(item.position ?? item.designation),
    designation: item.designation ? String(item.designation) : item.position ? String(item.position) : undefined,
    address: item.address ? String(item.address) : undefined,
    status: normalizeStatus(item.status),
    hireDate,
    joiningDate: item.joiningDate ? toDateString(item.joiningDate) : hireDate,
    salary: toNumber(item.salary ?? baseSalary, baseSalary),
    baseSalary,
    createdAt: toDateString(item.createdAt),
    updatedAt: item.updatedAt ? toDateString(item.updatedAt) : undefined,
  }
}

const toBackendEmployeePayload = (data: CreateEmployeeDTO | UpdateEmployeeDTO) => ({
  ...data,
  role: data.role,
  salary: data.salary !== undefined || data.baseSalary !== undefined ? Number(data.salary ?? data.baseSalary ?? 0) : undefined,
  position: data.position ?? data.designation,
  hireDate: data.hireDate ?? data.joiningDate,
})

export const useEmployeeStore = create<EmployeeState>((set, get) => ({
  employees: [],
  selectedEmployee: null,
  filters: {},
  isLoading: false,
  error: null,

  fetchEmployees: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await api(API_ENDPOINTS.employees)
      set({ employees: asArray(data).map(normalizeEmployee), isLoading: false, error: null })
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to fetch employees' })
      throw error
    }
  },

  getEmployeeById: (id: string) => get().employees.find(e => e.id === id || e.employeeId === id),
  setSelectedEmployee: (employee: Employee | null) => set({ selectedEmployee: employee }),

  addEmployee: async (employeeData: CreateEmployeeDTO) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api(API_ENDPOINTS.employees, {
        method: 'POST',
        body: JSON.stringify({ ...toBackendEmployeePayload(employeeData), password: employeeData.password }),
      })
      const employee = normalizeEmployee(response)
      const employeeWithPassword = employeeData.password
        ? { ...employee, password: employeeData.password }
        : employee
      set(state => ({ employees: [employeeWithPassword, ...state.employees], isLoading: false, error: null }))
      return employeeWithPassword
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to create employee' })
      throw error
    }
  },

  createEmployee: async (employeeData: CreateEmployeeDTO) => get().addEmployee(employeeData),

  updateEmployee: async (id: string, updates: UpdateEmployeeDTO) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api(`${API_ENDPOINTS.employees}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(toBackendEmployeePayload(updates)),
      })
      const employee = normalizeEmployee(response)
      set(state => ({
        employees: state.employees.map(e => e.id === id ? employee : e),
        selectedEmployee: state.selectedEmployee?.id === id ? employee : state.selectedEmployee,
        isLoading: false,
        error: null,
      }))
      return employee
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to update employee' })
      throw error
    }
  },

  deleteEmployee: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      await api(`${API_ENDPOINTS.employees}/${id}`, { method: 'DELETE' })
      set(state => ({ employees: state.employees.filter(e => e.id !== id), isLoading: false, error: null }))
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to delete employee' })
      throw error
    }
  },

  setFilters: (filters: EmployeeFilters) => set({ filters }),
  clearFilters: () => set({ filters: {} }),
}))

export const getFilteredEmployees = (state: EmployeeState): Employee[] => {
  const { employees, filters } = state

  return employees.filter(employee => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      const matchesSearch =
        employee.name.toLowerCase().includes(searchLower) ||
        employee.email.toLowerCase().includes(searchLower) ||
        employee.employeeId.toLowerCase().includes(searchLower) ||
        employee.position.toLowerCase().includes(searchLower) ||
        (employee.cnic || '').toLowerCase().includes(searchLower)
      if (!matchesSearch) return false
    }

    if (filters.status && employee.status !== filters.status) return false
    return true
  })
}
