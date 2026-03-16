/** 設為 true 可在不加 URL 參數的情況下直接啟用 mock scan（僅 DEV build 有效） */
export const MOCK_SCAN_ENABLED = false

import { ApiError } from '@/client'
import type { ApiRequestOptions } from '@/client/core/ApiRequestOptions'
import type { ApiResult } from '@/client/core/ApiResult'
import { createVirtualMaterial } from '@/domain/material/BarcodeScanRules'
import type { ScanResultLike } from '@/domain/material/MaterialScanDecision'
import type { SmtMaterialInventory } from '@/client'

type SmtMaterialInventoryEx = SmtMaterialInventory & { remark?: string }

function makeApiError(status: number, statusText: string): ApiError {
    const request: ApiRequestOptions = { method: 'GET', url: '/mock' }
    const response: ApiResult = { url: '/mock', ok: false, status, statusText, body: null }
    return new ApiError(request, response, statusText)
}

/**
 * Dev-only mock scan function.
 * 條碼前綴規則：
 *   503xxx → api_error (503) → "ERP 連線錯誤..."
 *   404xxx → api_error (404) → "查無此條碼"
 *   其他   → virtual_success，焦點自動移至槽位輸入
 */
export function createMockScan(): (barcode: string) => Promise<ScanResultLike<SmtMaterialInventoryEx, unknown>> {
    return async (barcode: string): Promise<ScanResultLike<SmtMaterialInventoryEx, unknown>> => {
        await new Promise(resolve => setTimeout(resolve, 200))

        if (barcode.startsWith('503')) {
            return { status: 'api_error', error: makeApiError(503, 'Service Unavailable') }
        }

        if (barcode.startsWith('404')) {
            return { status: 'api_error', error: makeApiError(404, 'Not Found') }
        }

        const virtualMaterial = createVirtualMaterial(barcode) as SmtMaterialInventoryEx
        return { status: 'virtual_success', data: { materialInventory: virtualMaterial, matchedRows: [] } }
    }
}
