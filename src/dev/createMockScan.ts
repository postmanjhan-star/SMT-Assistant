/** 設為 true 可在不加 URL 參數的情況下直接啟用 mock scan（僅 DEV build 有效） */
export const MOCK_SCAN_ENABLED = false

import { ApiError } from '@/client'
import type { ApiRequestOptions } from '@/client/core/ApiRequestOptions'
import type { ApiResult } from '@/client/core/ApiResult'
import { createVirtualMaterial } from '@/domain/material/BarcodeScanRules'
import type { ScanResultLike } from '@/domain/material/MaterialScanDecision'
import type { SmtMaterialInventory } from '@/client'
import {
    MATERIAL_UNLOAD_TRIGGER,
    MATERIAL_SPLICE_TRIGGER,
    MATERIAL_FORCE_UNLOAD_TRIGGER,
    MATERIAL_IPQC_TRIGGER,
} from '@/domain/mounter/operationModes'

type SmtMaterialInventoryEx = SmtMaterialInventory & { remark?: string }

const MODE_TRIGGERS = new Set([
    MATERIAL_UNLOAD_TRIGGER,
    MATERIAL_SPLICE_TRIGGER,
    MATERIAL_FORCE_UNLOAD_TRIGGER,
    MATERIAL_IPQC_TRIGGER,
])

function makeApiError(status: number, statusText: string): ApiError {
    const request: ApiRequestOptions = { method: 'GET', url: '/mock' }
    const response: ApiResult = { url: '/mock', ok: false, status, statusText, body: null }
    return new ApiError(request, response, statusText)
}

/**
 * Dev-only mock scan function.
 * 條碼前綴／精確碼規則：
 *   S5555 / S5566 / S5577 / S5588 → api_error (404)  ← 模式觸發碼，正常由 beforeScan 攔截，這裡作安全防護
 *   503xxx   → api_error (503)  ← 模擬 ERP 回應錯誤（Service Unavailable）
 *   404xxx   → api_error (404)  ← 模擬物料查無
 *   NOCONN   → 拋出 network Error ← 模擬 ERP 完全連不到（觸發 unknown_error 路徑）
 *   其他     → virtual_success，焦點自動移至槽位輸入
 */
export function createMockScan(): (barcode: string) => Promise<ScanResultLike<SmtMaterialInventoryEx, unknown>> {
    return async (barcode: string): Promise<ScanResultLike<SmtMaterialInventoryEx, unknown>> => {
        await new Promise(resolve => setTimeout(resolve, 200))

        if (MODE_TRIGGERS.has(barcode.toUpperCase())) {
            return { status: 'api_error', error: makeApiError(404, 'Not Found') }
        }

        if (barcode.startsWith('503')) {
            const virtualMaterial = createVirtualMaterial(barcode) as SmtMaterialInventoryEx
            return { status: 'virtual_success', data: { materialInventory: virtualMaterial, matchedRows: [] } }
        }

        if (barcode.startsWith('404')) {
            return { status: 'api_error', error: makeApiError(404, 'Not Found') }
        }

        if (barcode.toUpperCase().startsWith('NOCONN')) {
            throw new Error('Network unreachable (mock)')
        }

        const virtualMaterial = createVirtualMaterial(barcode) as SmtMaterialInventoryEx
        return { status: 'virtual_success', data: { materialInventory: virtualMaterial, matchedRows: [] } }
    }
}
