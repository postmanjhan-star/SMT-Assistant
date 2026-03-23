// eslint-disable-next-line no-restricted-imports -- [Phase-1 whitelist] tracked in REFACTORING_BASELINE.md, fix in Phase 2 (Domain 純化)
import { ApiError } from "@/client"

const ERP_TIMEOUT_MESSAGE = "ERP 連線超時，請確認 ERP 連線"
const ERP_CONNECTION_ERROR_MESSAGE =
  "ERP 連線錯誤，請確認 ERP 連線【請聯繫資訊管理部門】"

function isLikelyNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true

  const message = String((error as { message?: unknown })?.message ?? "").toLowerCase()
  if (!message) return false

  return (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("connection") ||
    message.includes("timeout")
  )
}

export function resolveMaterialLookupError(
  error: unknown,
  fallbackMessage = "物料查詢失敗"
): string {
  if (error instanceof ApiError) {
    return (
      {
        404: "查無此條碼",
        500: "系統錯誤",
        502: ERP_CONNECTION_ERROR_MESSAGE,
        503: ERP_CONNECTION_ERROR_MESSAGE,
        504: ERP_TIMEOUT_MESSAGE,
      }[error.status] ?? "未知錯誤"
    )
  }

  if (isLikelyNetworkError(error)) {
    return ERP_CONNECTION_ERROR_MESSAGE
  }

  return fallbackMessage
}
