import { PiniaPluginContext } from 'pinia'

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
    localStorage.setItem(store.$id, JSON.stringify(state))
  })
}
