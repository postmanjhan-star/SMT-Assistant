import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// --- TypeScript Interfaces for your Auth Data ---

interface HttpBasicValue {
  username: string
  password?: string
  // 其他內部屬性可以設為 any 或更精確的型別
  [key: string]: any
}

interface HttpBasic {
  name: string
  schema: {
    type: 'http'
    scheme: 'basic'
  }
  value: HttpBasicValue
}

interface OAuth2Token {
  access_token: string
  token_type: 'bearer' | string
  refresh_token?: string
}

interface OAuth2PasswordBearer {
  schema: {
    flow: 'password'
    tokenUrl: string
    scopes: Record<string, any>
    type: 'oauth2'
  }
  token: OAuth2Token | null
  username: string
  password?: string
  employee?: { idno: string; full_name: string }
  // 其他屬性
  [key:string]: any
}

/**
 * The complete structure of the 'authorized' state.
 */
export interface AuthState {
  HTTPBasic: HttpBasic | null
  OAuth2PasswordBearer: OAuth2PasswordBearer | null
}

// --- Pinia Store Definition ---

export const useAuthStore = defineStore('authorized', () => {
  // 初始狀態。插件會自動從 localStorage 讀取資料並覆蓋這裡的初始值。
  // 改為扁平化結構以符合 localStorage 的儲存格式 (直接儲存 HTTPBasic 和 OAuth2PasswordBearer)
  const HTTPBasic = ref<HttpBasic | null>(null)
  const OAuth2PasswordBearer = ref<OAuth2PasswordBearer | null>(null)
  const tokenExpiresAt = ref<number | null>(null) // ms timestamp，null = 無設定不過期
  const needsReauth = ref(false) // 401 攔截器觸發時設為 true，通知 useScanLoginModal 彈出登入

  // 為了相容性，保留 authState 作為 computed 屬性，讓外部依然可以透過 authStore.authState 存取
  const authState = computed<AuthState>(() => ({ HTTPBasic: HTTPBasic.value, OAuth2PasswordBearer: OAuth2PasswordBearer.value }))

  // --- Getters (Computed properties) ---
  const accessToken = computed(() => OAuth2PasswordBearer.value?.token?.access_token)
  const isLoggedIn = computed(() => !!accessToken.value)
  const isTokenExpired = computed<boolean>(() => {
    if (tokenExpiresAt.value === null) return false
    return Date.now() > tokenExpiresAt.value
  })

  // --- Actions ---

  /**
   * 在登入成功後，用完整的授權資料來更新整個 state
   * @param newState - The full auth object from the login response.
   */
  function setAuthState(newState: AuthState) {
    HTTPBasic.value = newState.HTTPBasic
    OAuth2PasswordBearer.value = newState.OAuth2PasswordBearer
  }

  function clearAuth() {
    HTTPBasic.value = null
    OAuth2PasswordBearer.value = null
  }

  function markNeedsReauth() {
    OAuth2PasswordBearer.value = null
    tokenExpiresAt.value = null
    needsReauth.value = true
  }

  function clearNeedsReauth() {
    needsReauth.value = false
  }

  function setToken(token: OAuth2Token, employee?: { idno: string; full_name: string }, expiresIn?: number | null) {
    if (!OAuth2PasswordBearer.value) {
      OAuth2PasswordBearer.value = {
        schema: {
          flow: 'password',
          tokenUrl: '',
          scopes: {},
          type: 'oauth2'
        },
        token: token as any,
        username: employee?.full_name ?? ''
      }
    } else {
      OAuth2PasswordBearer.value.token = token as any
      if (employee) {
        OAuth2PasswordBearer.value.username = employee.full_name
      }
    }
    if (employee && OAuth2PasswordBearer.value) {
      OAuth2PasswordBearer.value.employee = employee
    }
    tokenExpiresAt.value = (expiresIn != null && expiresIn > 0)
      ? Date.now() + expiresIn * 1000
      : null
  }

  return { HTTPBasic, OAuth2PasswordBearer, authState, accessToken, isLoggedIn, isTokenExpired, tokenExpiresAt, needsReauth, setAuthState, clearAuth, setToken, markNeedsReauth, clearNeedsReauth }
})