import { create } from 'zustand'
import type { Product, ProductFilters, CreateProductDTO, UpdateProductDTO } from '@/lib/types'
import { api, API_ENDPOINTS } from '@/lib/api'
import { asArray, asObject, toDateString, toLowerStatus, toNumber, toStringValue } from '@/lib/api-normalizers'

interface InventoryState {
  products: Product[]
  selectedProduct: Product | null
  filters: ProductFilters
  isLoading: boolean
  error: string | null

  fetchProducts: () => Promise<void>
  getProductById: (id: string) => Product | undefined
  getProductByBarcode: (barcode: string) => Product | undefined
  setSelectedProduct: (product: Product | null) => void
  addProduct: (product: CreateProductDTO) => Promise<Product & { duplicateWarning?: string }>
  updateProduct: (id: string, updates: UpdateProductDTO) => Promise<Product & { duplicateWarning?: string }>
  deleteProduct: (id: string) => Promise<void>
  setFilters: (filters: ProductFilters) => void
  clearFilters: () => void
}

const normalizeProduct = (payload: unknown): Product => {
  const item = asObject<Record<string, any>>(payload)
  return {
    id: toStringValue(item.id ?? item._id),
    sku: toStringValue(item.sku ?? item.id),
    barcode: toStringValue(item.barcode ?? item.upc),
    name: toStringValue(item.name),
    description: toStringValue(item.description),
    category: toStringValue(item.category, 'General'),
    subcategory: toStringValue(item.subcategory, ''),
    brand: toStringValue(item.brand),
    vendorId: item.vendorId ? String(item.vendorId) : undefined,
    vendorName: item.vendorName ? String(item.vendorName) : undefined,
    costPrice: toNumber(item.costPrice, 0),
    sellingPrice: toNumber(item.sellingPrice ?? item.price, 0),
    taxRate: toNumber(item.taxRate, 0),
    quantity: toNumber(item.quantity ?? item.stock, 0),
    reorderLevel: toNumber(item.reorderLevel, 0),
    maxStock: toNumber(item.maxStock, 0),
    status: toLowerStatus(item.status, 'active'),
    image: toStringValue(item.image),
    images: Array.isArray(item.images) ? item.images.map(String) : [],
    variants: Array.isArray(item.variants) ? item.variants : [],
    createdAt: toDateString(item.createdAt),
    updatedAt: toDateString(item.updatedAt),
  }
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  products: [],
  selectedProduct: null,
  filters: {},
  isLoading: false,
  error: null,

  fetchProducts: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await api(API_ENDPOINTS.products)
      set({ products: asArray(data).map(normalizeProduct), isLoading: false, error: null })
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to fetch products' })
      throw error
    }
  },

  getProductById: (id: string) => get().products.find(p => p.id === id),
  getProductByBarcode: (barcode: string) => get().products.find(p => p.barcode === barcode),
  setSelectedProduct: (product: Product | null) => set({ selectedProduct: product }),

  addProduct: async (productData: CreateProductDTO) => {
    set({ isLoading: true, error: null })
    try {
      const duplicate = get().products.find(p => p.barcode && p.barcode === productData.barcode)
      if (duplicate) {
        throw new Error(`Barcode "${productData.barcode}" is already assigned to "${duplicate.name}".`)
      }

      const response = await api(API_ENDPOINTS.products, {
        method: 'POST',
        body: JSON.stringify(productData),
      })
      const newProduct = normalizeProduct(response)
      set(state => ({ products: [newProduct, ...state.products], isLoading: false, error: null }))
      // Duplicate SKUs are allowed (not blocked) — the backend surfaces a
      // non-blocking warning in the response instead, same pattern as
      // BillStore's duplicateWarning for duplicate bill numbers.
      const duplicateWarning = (response as any)?.duplicateWarning
      return duplicateWarning ? { ...newProduct, duplicateWarning } : newProduct
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to create product' })
      throw error
    }
  },

  updateProduct: async (id: string, updates: UpdateProductDTO) => {
    set({ isLoading: true, error: null })
    try {
      if (updates.barcode) {
        const duplicate = get().products.find(p => p.barcode === updates.barcode && p.id !== id)
        if (duplicate) throw new Error(`Barcode "${updates.barcode}" is already assigned to "${duplicate.name}".`)
      }

      const response = await api(`${API_ENDPOINTS.products}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
      const updatedProduct = normalizeProduct(response)
      set(state => ({
        products: state.products.map(p => p.id === id ? updatedProduct : p),
        selectedProduct: state.selectedProduct?.id === id ? updatedProduct : state.selectedProduct,
        isLoading: false,
        error: null,
      }))
      const duplicateWarning = (response as any)?.duplicateWarning
      return duplicateWarning ? { ...updatedProduct, duplicateWarning } : updatedProduct
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to update product' })
      throw error
    }
  },

  deleteProduct: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      await api(`${API_ENDPOINTS.products}/${id}`, { method: 'DELETE' })
      set(state => ({ products: state.products.filter(p => p.id !== id), isLoading: false, error: null }))
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to delete product' })
      throw error
    }
  },

  setFilters: (filters: ProductFilters) => set({ filters }),
  clearFilters: () => set({ filters: {} }),
}))

export const getFilteredProducts = (state: InventoryState): Product[] => {
  const { products, filters } = state

  return products.filter(product => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      const matchesSearch =
        product.name.toLowerCase().includes(searchLower) ||
        product.sku.toLowerCase().includes(searchLower) ||
        product.brand.toLowerCase().includes(searchLower) ||
        product.barcode.toLowerCase().includes(searchLower) ||
        (product.vendorName || '').toLowerCase().includes(searchLower)
      if (!matchesSearch) return false
    }

    if (filters.barcode && !product.barcode.includes(filters.barcode)) return false
    if (filters.category && product.category !== filters.category) return false
    if (filters.status && product.status !== filters.status) return false

    if (filters.stockStatus) {
      if (filters.stockStatus === 'out_of_stock' && product.quantity > 0) return false
      if (filters.stockStatus === 'low_stock' && (product.quantity === 0 || product.quantity >= product.reorderLevel)) return false
      if (filters.stockStatus === 'in_stock' && product.quantity < product.reorderLevel) return false
    }

    if (filters.minPrice !== undefined && product.sellingPrice < filters.minPrice) return false
    if (filters.maxPrice !== undefined && product.sellingPrice > filters.maxPrice) return false

    return true
  })
}
