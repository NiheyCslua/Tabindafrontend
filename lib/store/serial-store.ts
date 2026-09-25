import { create } from 'zustand'
import type { SerialUnit } from '@/lib/types'
import { api, API_ENDPOINTS } from '@/lib/api'
import { asArray, asObject, toDateString, toNumber, toStringValue } from '@/lib/api-normalizers'

type SerialUnitInput = Omit<SerialUnit, 'status'> & { status?: SerialUnit['status'] }
type SerialMetadata = Partial<Omit<SerialUnit, 'serialNumber'>>

interface SerialState {
  units: SerialUnit[]
  isLoading: boolean
  error: string | null

  fetchUnits: () => Promise<void>
  addUnits: (units: SerialUnitInput[]) => Promise<void>
  addOrUpdateUnit: (unit: SerialUnitInput) => Promise<void>
  findBySerial: (serial: string) => SerialUnit | undefined
  findByProduct: (productId: string, status?: SerialUnit['status']) => SerialUnit[]
  markSold: (serialNumber: string, metadata?: SerialMetadata) => Promise<void>
  markInStock: (serialNumber: string, metadata?: SerialMetadata) => Promise<void>
  returnSerial: (serialNumber: string) => Promise<void>
}

const LOCAL_SERIAL_UNITS_KEY = 'hb_serial_units'

const normalizeSerialKey = (serial: string) => serial.trim()

const normalizeUnit = (payload: unknown): SerialUnit => {
  const item = asObject<Record<string, any>>(payload)
  return {
    id: item.id ? String(item.id) : undefined,
    serialNumber: toStringValue(item.serialNumber),
    productId: toStringValue(item.productId),
    productName: toStringValue(item.productName),
    productSku: toStringValue(item.productSku ?? item.sku),
    sku: item.sku ? String(item.sku) : item.productSku ? String(item.productSku) : undefined,
    barcode: toStringValue(item.barcode),
    vendorId: item.vendorId ? String(item.vendorId) : undefined,
    vendorName: item.vendorName ? String(item.vendorName) : undefined,
    purchaseDate: item.purchaseDate ? toDateString(item.purchaseDate) : undefined,
    costPrice: toNumber(item.costPrice, 0),
    status: (String(item.status ?? 'in_stock') as SerialUnit['status']) || 'in_stock',
    purchaseBillId: item.purchaseBillId ? String(item.purchaseBillId) : undefined,
    purchaseBillNumber: item.purchaseBillNumber ? String(item.purchaseBillNumber) : undefined,
    purchaseUnitPrice: item.purchaseUnitPrice === null || item.purchaseUnitPrice === undefined ? undefined : toNumber(item.purchaseUnitPrice, 0),
    saleInvoiceId: item.saleInvoiceId ? String(item.saleInvoiceId) : undefined,
    saleInvoiceNumber: item.saleInvoiceNumber ? String(item.saleInvoiceNumber) : undefined,
    soldAt: item.soldAt ? toDateString(item.soldAt) : undefined,
    customerId: item.customerId ? String(item.customerId) : undefined,
    customerName: item.customerName ? String(item.customerName) : undefined,
    saleUnitPrice: item.saleUnitPrice === null || item.saleUnitPrice === undefined ? undefined : toNumber(item.saleUnitPrice, 0),
  }
}

const mergeUnit = (existing: SerialUnit | undefined, incoming: SerialUnitInput): SerialUnit => ({
  ...(existing ?? {}),
  ...incoming,
  id: incoming.id ?? existing?.id ?? `${incoming.productId}-${incoming.serialNumber}`,
  sku: incoming.sku ?? incoming.productSku ?? existing?.sku,
  status: incoming.status ?? existing?.status ?? 'in_stock',
})

const canUseLocalStorage = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

const readLocalUnits = (): SerialUnit[] => {
  if (!canUseLocalStorage()) return []
  try {
    const raw = window.localStorage.getItem(LOCAL_SERIAL_UNITS_KEY)
    if (!raw) return []
    return asArray(JSON.parse(raw))
      .map(normalizeUnit)
      .filter(unit => normalizeSerialKey(unit.serialNumber).length > 0)
  } catch {
    return []
  }
}

const writeLocalUnits = (units: SerialUnit[]) => {
  if (!canUseLocalStorage()) return
  try {
    window.localStorage.setItem(LOCAL_SERIAL_UNITS_KEY, JSON.stringify(units))
  } catch {
    // Local storage can be unavailable in private/incognito modes or full disks.
  }
}

const mergeUnitLists = (baseUnits: SerialUnit[], incomingUnits: SerialUnitInput[]) => {
  const bySerial = new Map(baseUnits.map(unit => [normalizeSerialKey(unit.serialNumber), unit]))
  for (const unit of incomingUnits) {
    const key = normalizeSerialKey(unit.serialNumber)
    if (!key) continue
    bySerial.set(key, mergeUnit(bySerial.get(key), { ...unit, serialNumber: key }))
  }
  return Array.from(bySerial.values())
}

const serialEndpointWarning = (action: string, error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.warn(`Serial units API unavailable while trying to ${action}. Using browser storage fallback.`, message)
}

export const useSerialStore = create<SerialState>((set, get) => ({
  units: [],
  isLoading: false,
  error: null,

  fetchUnits: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await api(API_ENDPOINTS.serialUnits)
      const units = asArray(data).map(normalizeUnit)
      writeLocalUnits(units)
      set({ units, isLoading: false, error: null })
    } catch (error) {
      serialEndpointWarning('fetch serial units', error)
      set({ units: readLocalUnits(), isLoading: false, error: null })
    }
  },

  addUnits: async (newUnits) => {
    if (newUnits.length === 0) return

    const payloads = newUnits.map(unit => ({
      ...unit,
      serialNumber: normalizeSerialKey(unit.serialNumber),
      status: unit.status ?? 'in_stock' as const,
    }))

    try {
      const savedUnits: SerialUnit[] = []
      for (const payload of payloads) {
        const response = await api(API_ENDPOINTS.serialUnits, {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        savedUnits.push(normalizeUnit(response))
      }

      set(state => {
        const units = mergeUnitLists(state.units, savedUnits)
        writeLocalUnits(units)
        return { units, error: null }
      })
    } catch (error) {
      serialEndpointWarning('save serial units', error)
      set(state => {
        const units = mergeUnitLists(mergeUnitLists(readLocalUnits(), state.units), payloads)
        writeLocalUnits(units)
        return { units, error: null }
      })
    }
  },

  addOrUpdateUnit: async (unit) => get().addUnits([unit]),

  findBySerial: (serial) => {
    const key = normalizeSerialKey(serial)
    return get().units.find(u => normalizeSerialKey(u.serialNumber) === key)
      ?? readLocalUnits().find(u => normalizeSerialKey(u.serialNumber) === key)
  },

  findByProduct: (productId, status) => mergeUnitLists(readLocalUnits(), get().units).filter(
    u => u.productId === productId && (status ? u.status === status : true)
  ),

  markSold: async (serialNumber, metadata = {}) => {
    const key = normalizeSerialKey(serialNumber)
    const updateSold = (units: SerialUnit[]) => units.map(unit =>
      normalizeSerialKey(unit.serialNumber) === key
        ? mergeUnit(unit, { ...unit, ...metadata, serialNumber: key, status: 'sold' })
        : unit
    )

    set(state => {
      const units = updateSold(mergeUnitLists(readLocalUnits(), state.units))
      writeLocalUnits(units)
      return { units, error: null }
    })

    try {
      const response = await api(`${API_ENDPOINTS.serialUnits}/${encodeURIComponent(key)}/sell`, {
        method: 'PATCH',
        body: JSON.stringify(metadata),
      })
      const updated = normalizeUnit(response)
      set(state => {
        const units = mergeUnitLists(
          state.units.filter(unit => normalizeSerialKey(unit.serialNumber) !== key),
          [updated]
        )
        writeLocalUnits(units)
        return { units, error: null }
      })
    } catch (error) {
      serialEndpointWarning('mark a serial unit as sold', error)
    }
  },

  markInStock: async (serialNumber, metadata = {}) => {
    const key = normalizeSerialKey(serialNumber)
    const updateInStock = (units: SerialUnit[]) => units.map(unit =>
      normalizeSerialKey(unit.serialNumber) === key
        ? mergeUnit(unit, { ...unit, ...metadata, serialNumber: key, status: 'in_stock' })
        : unit
    )

    set(state => {
      const units = updateInStock(mergeUnitLists(readLocalUnits(), state.units))
      writeLocalUnits(units)
      return { units, error: null }
    })

    try {
      const response = await api(`${API_ENDPOINTS.serialUnits}/${encodeURIComponent(key)}/restock`, {
        method: 'PATCH',
        body: JSON.stringify(metadata),
      })
      const updated = normalizeUnit(response)
      set(state => {
        const units = mergeUnitLists(
          state.units.filter(unit => normalizeSerialKey(unit.serialNumber) !== key),
          [updated]
        )
        writeLocalUnits(units)
        return { units, error: null }
      })
    } catch (error) {
      serialEndpointWarning('mark a serial unit as in stock', error)
    }
  },

  returnSerial: async (serialNumber) => {
    const key = normalizeSerialKey(serialNumber)

    // Optimistically mark as in_stock in local state
    set(state => {
      const units = mergeUnitLists(readLocalUnits(), state.units).map(unit =>
        normalizeSerialKey(unit.serialNumber) === key
          ? { ...unit, status: 'in_stock' as const }
          : unit
      )
      writeLocalUnits(units)
      return { units, error: null }
    })

    try {
      const response = await api(`${API_ENDPOINTS.serialUnits}/${encodeURIComponent(key)}/return`, {
        method: 'PATCH',
      })
      const updated = normalizeUnit(response)
      set(state => {
        const units = mergeUnitLists(
          state.units.filter(unit => normalizeSerialKey(unit.serialNumber) !== key),
          [updated]
        )
        writeLocalUnits(units)
        return { units, error: null }
      })
    } catch (error) {
      serialEndpointWarning('return a serial unit to stock', error)
    }
  },
}))
