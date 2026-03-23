/**
 * Domain-level HTTP error interface.
 * 不依賴 @/client/core/ApiError，用 duck-type 檢查取代 instanceof。
 */
export interface HttpErrorLike {
  status: number
}

export function isHttpError(error: unknown): error is HttpErrorLike {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as HttpErrorLike).status === 'number'
  )
}
