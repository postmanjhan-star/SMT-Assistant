import { ref, computed } from "vue"
import { useAuthStore } from "@/stores/authStore"
// eslint-disable-next-line no-restricted-imports -- [Phase-1 whitelist] 既有違規，@/client 暫留
import { SmtService } from "@/client"

export function useScanLoginModal() {
  const authStore = useAuthStore()

  const showLoginModal = ref(false)
  const loginInput = ref("")
  const loginError = ref("")
  const isLoginLoading = ref(false)
  const isLoginRequired = ref(false) // true = 頁面載入時未登入，無法取消

  const currentUsername = computed(
    () =>
      authStore.authState.OAuth2PasswordBearer?.username ??
      authStore.authState.HTTPBasic?.value?.username ??
      ""
  )

  const currentOperatorIdno = computed(
    () => authStore.authState.OAuth2PasswordBearer?.employee?.idno ?? ""
  )

  function openLoginModal(required: boolean) {
    loginInput.value = ""
    loginError.value = ""
    isLoginRequired.value = required
    showLoginModal.value = true
  }

  function closeLoginModal() {
    showLoginModal.value = false
    loginInput.value = ""
    loginError.value = ""
  }

  async function handleLoginSubmit() {
    const raw = loginInput.value.trim()
    if (!raw) return

    const colonIndex = raw.indexOf(":")
    if (colonIndex === -1) {
      loginError.value = "條碼格式錯誤，應為 work_id:signature"
      loginInput.value = ""
      return
    }

    const workId = parseInt(raw.slice(0, colonIndex), 10)
    const signature = raw.slice(colonIndex + 1)

    if (isNaN(workId)) {
      loginError.value = "work_id 必須為數字"
      loginInput.value = ""
      return
    }

    isLoginLoading.value = true
    loginError.value = ""
    try {
      const result = await SmtService.operatorSwitchUser({
        requestBody: { work_id: workId, signature },
      })
      authStore.setToken({ access_token: result.access_token, token_type: result.token_type }, result.employee)
      closeLoginModal()
    } catch {
      loginError.value = "登入失敗，請確認條碼是否正確"
      loginInput.value = ""
    } finally {
      isLoginLoading.value = false
    }
  }

  function handleUserSwitchTrigger(code: string): boolean {
    if (code === "S1111") {
      openLoginModal(false)
      return true
    }
    return false
  }

  /**
   * 頁面載入時使用。
   * 只在「從未有任何登入紀錄」時才彈出登入 Modal（OAuth2PasswordBearer 物件不存在）。
   * 這區分了「完全未登入」與「曾登入但 token 過期」兩種狀態。
   * 正式環境強制登入（不可取消），開發環境可取消。
   */
  function autoOpenIfUnauthenticated() {
    const oauth2 = authStore.authState.OAuth2PasswordBearer
    if (!oauth2 || !oauth2.employee) {
      openLoginModal(import.meta.env.PROD)
    }
  }

  return {
    showLoginModal,
    loginInput,
    loginError,
    isLoginLoading,
    isLoginRequired,
    currentUsername,
    currentOperatorIdno,
    openLoginModal,
    closeLoginModal,
    handleLoginSubmit,
    handleUserSwitchTrigger,
    autoOpenIfUnauthenticated,
  }
}
