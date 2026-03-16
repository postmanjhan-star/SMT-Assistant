import { PiniaPluginContext } from 'pinia'

function safeStringify(value: unknown) {
  const seen = new WeakSet<object>()

  return JSON.stringify(value, (_key, val) => {
    if (typeof val === 'function') return undefined
    if (typeof val !== 'object' || val === null) return val

    if (val instanceof Date) return val.toISOString()

    if (seen.has(val)) return undefined
    seen.add(val)

    if (Array.isArray(val)) return val

    const proto = Object.getPrototypeOf(val)
    if (proto === Object.prototype || proto === null) {
      return val
    }

    return undefined
  })
}

export function piniaLocalStoragePlugin({ store }: PiniaPluginContext) {
  // 1. 初始化時，嘗試從 localStorage 取得資料並還原 (Hydrate)
  const storedState = localStorage.getItem(store.$id)
  if (storedState) {
    try {
      store.$patch(JSON.parse(storedState))
    } catch (error) {
      console.error(`Failed to parse stored state for ${store.$id}`, error)
    }
  }

  // 2. 訂閱 store 的變化，當 state 改變時寫入 localStorage
  store.$subscribe((_mutation, state) => {
    try {
      const serialized = safeStringify(state)
      if (serialized !== undefined) {
        localStorage.setItem(store.$id, serialized)
      }
    } catch (error) {
      console.warn(`Failed to serialize state for ${store.$id}`, error)
    }
  })
}
