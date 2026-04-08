import { beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/authStore'

/**
 * Unit-test bootstrap:
 * - Create a fresh Pinia instance before every test so stores don't bleed across tests.
 * - Pre-seed the auth store as logged-in, because composables that wrap
 *   useOperationModeStateMachine assume the user is already authenticated
 *   (the machine starts in AUTHENTICATED.NORMAL, not UNAUTHENTICATED).
 */
beforeEach(() => {
  setActivePinia(createPinia())
  const auth = useAuthStore()
  auth.setToken({ access_token: 'test-token', token_type: 'bearer' })
})
