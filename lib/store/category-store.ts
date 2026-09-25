import { create } from 'zustand'
import type { ProductCategory } from '@/lib/types'
import { api, API_ENDPOINTS } from '@/lib/api'
import { asArray, asObject, toDateString, toStringValue } from '@/lib/api-normalizers'

interface CategoryState {
  categories: ProductCategory[]
  isLoading: boolean
  error: string | null

  fetchCategories: () => Promise<void>
  addCategory: (name: string) => Promise<ProductCategory>
  deleteCategory: (name: string) => Promise<void>
}

const normalizeCategory = (payload: unknown): ProductCategory => {
  const item = asObject<Record<string, any>>(payload)
  const name = toStringValue(item.name)

  return {
    id: toStringValue(item.id ?? name.toLowerCase(), name.toLowerCase()),
    name,
    createdAt: item.createdAt ? toDateString(item.createdAt) : undefined,
    updatedAt: item.updatedAt ? toDateString(item.updatedAt) : undefined,
  }
}

const uniqueByName = (categories: ProductCategory[]) => {
  const byName = new Map<string, ProductCategory>()

  for (const category of categories) {
    const name = category.name.trim()
    if (!name) continue
    const key = name.toLowerCase()
    if (!byName.has(key)) byName.set(key, { ...category, name })
  }

  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name))
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  isLoading: false,
  error: null,

  fetchCategories: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await api(API_ENDPOINTS.productCategories)
      set({ categories: uniqueByName(asArray(data).map(normalizeCategory)), isLoading: false, error: null })
    } catch (error: any) {
      // Keep the product form usable even before the migration has been run.
      set({ isLoading: false, error: error.message || 'Failed to fetch categories' })
    }
  },

  addCategory: async (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Category name is required')

    const existing = get().categories.find(category => category.name.toLowerCase() === trimmed.toLowerCase())
    if (existing) return existing

    set({ isLoading: true, error: null })
    try {
      const response = await api(API_ENDPOINTS.productCategories, {
        method: 'POST',
        body: JSON.stringify({ name: trimmed }),
      })
      const category = normalizeCategory(response)
      set(state => ({ categories: uniqueByName([...state.categories, category]), isLoading: false, error: null }))
      return category
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to add category' })
      throw error
    }
  },

  // Deletes the category and reassigns any products using it to
  // "Uncategorized" server-side — see InventoryService.deleteProductCategory.
  deleteCategory: async (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Category name is required')

    set({ isLoading: true, error: null })
    try {
      await api(`${API_ENDPOINTS.productCategories}/${encodeURIComponent(trimmed)}`, {
        method: 'DELETE',
      })
      set(state => ({
        categories: state.categories.filter(category => category.name.toLowerCase() !== trimmed.toLowerCase()),
        isLoading: false,
        error: null,
      }))
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to delete category' })
      throw error
    }
  },
}))
