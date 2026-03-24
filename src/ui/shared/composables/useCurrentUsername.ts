import { computed } from "vue"
import { useAuthStore } from "@/stores/authStore"

export function useCurrentUsername() {
  const authStore = useAuthStore()
  const currentUsername = computed(
    () =>
      authStore.authState.OAuth2PasswordBearer?.username ??
      authStore.authState.HTTPBasic?.value?.username ??
      ""
  )
  const currentOperatorIdno = computed(
    () => authStore.authState.OAuth2PasswordBearer?.employee?.idno ?? ""
  )
  return { currentUsername, currentOperatorIdno }
}
