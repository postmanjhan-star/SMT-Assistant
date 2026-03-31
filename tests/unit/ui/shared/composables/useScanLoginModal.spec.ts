import { setActivePinia, createPinia } from 'pinia'
import { flushPromises } from '@vue/test-utils'
import { useAuthStore } from '@/stores/authStore'
import { useScanLoginModal } from '@/ui/shared/composables/useScanLoginModal'
import type { SwitchUserResult } from '@/ui/di/shared/createScanLoginDeps'

function makeDeps(overrides: Partial<{ switchUser: (payload: { work_id: number; signature?: string }) => Promise<SwitchUserResult> }> = {}) {
  return {
    switchUser: vi.fn<[{ work_id: number; signature?: string }], Promise<SwitchUserResult>>(),
    ...overrides,
  }
}

function makeValidOAuth2(overrides: Record<string, unknown> = {}) {
  return {
    schema: { flow: 'password', tokenUrl: '', scopes: {}, type: 'oauth2' },
    token: { access_token: 'valid-token', token_type: 'bearer' },
    username: 'operator',
    employee: { idno: 'OP001', full_name: 'operator' },
    ...overrides,
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('useScanLoginModal', () => {
  describe('autoOpenIfUnauthenticated', () => {
    it('opens modal when OAuth2PasswordBearer is null', () => {
      const authStore = useAuthStore()
      authStore.OAuth2PasswordBearer = null

      const { showLoginModal, autoOpenIfUnauthenticated } = useScanLoginModal(makeDeps())
      autoOpenIfUnauthenticated()

      expect(showLoginModal.value).toBe(true)
    })

    it('opens modal when OAuth2PasswordBearer exists but employee is missing', () => {
      const authStore = useAuthStore()
      authStore.OAuth2PasswordBearer = makeValidOAuth2({ employee: undefined }) as any

      const { showLoginModal, autoOpenIfUnauthenticated } = useScanLoginModal(makeDeps())
      autoOpenIfUnauthenticated()

      expect(showLoginModal.value).toBe(true)
    })

    it('opens modal when token is expired', () => {
      const authStore = useAuthStore()
      authStore.OAuth2PasswordBearer = makeValidOAuth2() as any
      authStore.tokenExpiresAt = Date.now() - 1000 // 1 秒前已過期

      const { showLoginModal, autoOpenIfUnauthenticated } = useScanLoginModal(makeDeps())
      autoOpenIfUnauthenticated()

      expect(showLoginModal.value).toBe(true)
    })

    it('does not open modal when token has future expiry', () => {
      const authStore = useAuthStore()
      authStore.OAuth2PasswordBearer = makeValidOAuth2() as any
      authStore.tokenExpiresAt = Date.now() + 3_600_000 // 1 小時後

      const { showLoginModal, autoOpenIfUnauthenticated } = useScanLoginModal(makeDeps())
      autoOpenIfUnauthenticated()

      expect(showLoginModal.value).toBe(false)
    })

    it('does not open modal when tokenExpiresAt is null (backward compatible)', () => {
      const authStore = useAuthStore()
      authStore.OAuth2PasswordBearer = makeValidOAuth2() as any
      authStore.tokenExpiresAt = null

      const { showLoginModal, autoOpenIfUnauthenticated } = useScanLoginModal(makeDeps())
      autoOpenIfUnauthenticated()

      expect(showLoginModal.value).toBe(false)
    })
  })

  describe('handleLoginSubmit', () => {
    it('stores tokenExpiresAt when expires_in is provided', async () => {
      const authStore = useAuthStore()
      const mockSwitchUser = vi.fn().mockResolvedValue({
        access_token: 'new-token',
        token_type: 'bearer',
        expires_in: 3600,
        employee: { idno: '1001', full_name: 'Alice' },
      })

      const { loginInput, handleLoginSubmit } = useScanLoginModal({ switchUser: mockSwitchUser })
      loginInput.value = '1001:mysig'
      const before = Date.now()
      await handleLoginSubmit()
      await flushPromises()
      const after = Date.now()

      expect(authStore.tokenExpiresAt).toBeGreaterThanOrEqual(before + 3_600_000)
      expect(authStore.tokenExpiresAt).toBeLessThanOrEqual(after + 3_600_000)
      expect(authStore.isTokenExpired).toBe(false)
    })

    it('sets tokenExpiresAt to null when expires_in is absent', async () => {
      const authStore = useAuthStore()
      const mockSwitchUser = vi.fn().mockResolvedValue({
        access_token: 'new-token',
        token_type: 'bearer',
        employee: { idno: '1001', full_name: 'Alice' },
      })

      const { loginInput, handleLoginSubmit } = useScanLoginModal({ switchUser: mockSwitchUser })
      loginInput.value = '1001:mysig'
      await handleLoginSubmit()
      await flushPromises()

      expect(authStore.tokenExpiresAt).toBeNull()
      expect(authStore.isTokenExpired).toBe(false)
    })

    it('sets tokenExpiresAt to null when expires_in is null', async () => {
      const authStore = useAuthStore()
      const mockSwitchUser = vi.fn().mockResolvedValue({
        access_token: 'new-token',
        token_type: 'bearer',
        expires_in: null,
        employee: { idno: '1001', full_name: 'Alice' },
      })

      const { loginInput, handleLoginSubmit } = useScanLoginModal({ switchUser: mockSwitchUser })
      loginInput.value = '1001:mysig'
      await handleLoginSubmit()
      await flushPromises()

      expect(authStore.tokenExpiresAt).toBeNull()
    })
  })

  describe('isTokenExpired computed', () => {
    it('returns false when tokenExpiresAt is null', () => {
      const authStore = useAuthStore()
      authStore.tokenExpiresAt = null
      expect(authStore.isTokenExpired).toBe(false)
    })

    it('returns true when tokenExpiresAt is in the past', () => {
      const authStore = useAuthStore()
      authStore.tokenExpiresAt = Date.now() - 1
      expect(authStore.isTokenExpired).toBe(true)
    })

    it('returns false when tokenExpiresAt is in the future', () => {
      const authStore = useAuthStore()
      authStore.tokenExpiresAt = Date.now() + 60_000
      expect(authStore.isTokenExpired).toBe(false)
    })
  })
})
