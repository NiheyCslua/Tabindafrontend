import { create } from 'zustand'
import type { User, UserRole } from '@/lib/types'
import { api, API_ENDPOINTS } from '@/lib/api'
import { asArray, asObject, toDateString } from '@/lib/api-normalizers'

interface UserState {
  users: User[]
  isLoading: boolean
  error: string | null
  fetchUsers: () => Promise<void>
  createUser: (data: { name: string; email: string; password: string; role: string }) => Promise<User>
  updateUser: (id: string, data: Partial<{ name: string; email: string; password: string; role: string }>) => Promise<User>
  deleteUser: (id: string) => Promise<void>
}

const normalizeRole = (value: unknown): UserRole => {
  const role = String(value ?? 'employee').toLowerCase()
  if (role === 'admin' || role === 'inventory_manager') return role
  return 'employee'
}

const normalizeUser = (payload: unknown): User => {
  const item = asObject<User & Record<string, any>>(payload)
  const now = new Date().toISOString()
  return {
    id: String(item.id ?? item._id ?? crypto.randomUUID()),
    email: String(item.email ?? ''),
    name: String(item.name ?? ''),
    role: normalizeRole(item.role),
    avatar: item.avatar ? String(item.avatar) : undefined,
    createdAt: toDateString(item.createdAt, now),
  }
}

const toBackendUserPayload = (data: Partial<{ name: string; email: string; password: string; role: string }>) => ({
  ...data,
  role: data.role ? data.role.toUpperCase() : undefined,
})

export const useUserStore = create<UserState>((set, get) => ({
  users: [],
  isLoading: false,
  error: null,

  fetchUsers: async () => {
    set({ isLoading: true, error: null })

    try {
      const data = await api(API_ENDPOINTS.users)
      set({ users: asArray(data).map(normalizeUser), isLoading: false })
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to fetch users' })
      throw error
    }
  },

  createUser: async (data) => {
    set({ isLoading: true, error: null })

    try {
      const response = await api(API_ENDPOINTS.users, {
        method: 'POST',
        body: JSON.stringify(toBackendUserPayload(data)),
      })
      const user = normalizeUser(response)
      set(state => ({ users: [...state.users, user], isLoading: false, error: null }))
      await get().fetchUsers().catch(() => undefined)
      return user
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to create user' })
      throw error
    }
  },

  updateUser: async (id, data) => {
    set({ isLoading: true, error: null })

    try {
      const response = await api(`${API_ENDPOINTS.users}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(toBackendUserPayload(data)),
      })
      const existing = get().users.find(user => user.id === id)
      const user = normalizeUser({ ...existing, ...data, ...(response ?? {}), id })
      set(state => ({ users: state.users.map(u => u.id === id ? user : u), isLoading: false, error: null }))
      await get().fetchUsers().catch(() => undefined)
      return user
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to update user' })
      throw error
    }
  },

  deleteUser: async (id) => {
    set({ isLoading: true, error: null })

    try {
      await api(`${API_ENDPOINTS.users}/${id}`, { method: 'DELETE' })
      set(state => ({ users: state.users.filter(user => user.id !== id), isLoading: false, error: null }))
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to delete user' })
      throw error
    }
  },
}))
