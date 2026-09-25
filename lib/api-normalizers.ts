export const asArray = <T = any>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[]

  if (payload && typeof payload === 'object') {
    const source = payload as { data?: unknown; items?: unknown; results?: unknown; records?: unknown }
    if (Array.isArray(source.data)) return source.data as T[]
    if (Array.isArray(source.items)) return source.items as T[]
    if (Array.isArray(source.results)) return source.results as T[]
    if (Array.isArray(source.records)) return source.records as T[]
  }

  return []
}

export const toNumber = (value: unknown, fallback = 0): number => {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : fallback
}

export const toDateString = (value: unknown, fallback = new Date().toISOString()): string => {
  if (typeof value === 'string' && value.length > 0) return value
  if (value instanceof Date) return value.toISOString()
  return fallback
}

export const toDateOnly = (value: unknown, fallback = new Date().toISOString().split('T')[0]): string => {
  const raw = toDateString(value, fallback)
  return raw.includes('T') ? raw.split('T')[0] : raw
}

export const asObject = <T extends Record<string, any>>(payload: unknown): Partial<T> => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return {}
  return payload as Partial<T>
}

export const toStringValue = (value: unknown, fallback = ''): string => {
  if (value === null || value === undefined) return fallback
  return String(value)
}

export const toLowerStatus = <T extends string>(value: unknown, fallback: T): T => {
  if (value === null || value === undefined || value === '') return fallback
  return String(value).toLowerCase() as T
}

export const uniqueStrings = (values: unknown[]): string[] =>
  Array.from(new Set(values.map(value => String(value ?? '').trim()).filter(Boolean)))
