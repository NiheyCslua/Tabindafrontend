import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, UserRole, LoginCredentials } from '@/lib/types'
import { api, API_ENDPOINTS, setStoredToken } from '@/lib/api'
import { asObject, toDateString, toLowerStatus, toStringValue } from '@/lib/api-normalizers'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
  clearError: () => void
}

const normalizeRole = (value: unknown): UserRole => {
  const role = toLowerStatus<UserRole>(value, 'employee')
  if (role === 'admin' || role === 'inventory_manager') return role
  return 'employee'
}

const normalizeUser = (payload: unknown): User => {
  const item = asObject<Record<string, any>>(payload)
  return {
    id: toStringValue(item.id ?? item.userId ?? item.employeeId),
    email: toStringValue(item.email),
    name: toStringValue(item.name ?? item.email),
    role: normalizeRole(item.role),
    avatar: item.avatar ? String(item.avatar) : undefined,
    createdAt: toDateString(item.createdAt),
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null })

        try {
          const response = await api<Record<string, any>>(API_ENDPOINTS.authLogin, {
            method: 'POST',
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          })

          const token = response.access_token ?? response.token ?? response.accessToken
          if (!token) throw new Error('Login succeeded but no access token was returned')

          const userPayload = response.user ?? response
          const user = normalizeUser(userPayload)

          setStoredToken(String(token))
          set({ user, isAuthenticated: true, isLoading: false, error: null })
        } catch (error: any) {
          setStoredToken(null)
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: error.message || 'Invalid email or password',
          })
          throw error
        }
      },

      logout: () => {
        setStoredToken(null)
        set({ user: null, isAuthenticated: false, error: null })
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
