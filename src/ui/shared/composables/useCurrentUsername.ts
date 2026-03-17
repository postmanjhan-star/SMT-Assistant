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
  return { currentUsername }
}
