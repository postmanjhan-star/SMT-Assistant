export type ScanResultLike<TMaterial = unknown, TRow = unknown> =
    | {
        status: 'success' | 'virtual_success'
        data: { materialInventory: TMaterial; matchedRows: TRow[] }
    }
    | {
        status: 'no_match_in_grid'
        data?: { materialInventory: TMaterial; matchedRows: TRow[] }
    }
    | { status: 'api_error' | 'unknown_error'; error: unknown }

export type ScanDecision<TMaterial, TRow> =
    | {
        action: 'matched'
        tone: 'success' | 'info'
        messageKey: 'matched' | 'virtual' | 'no_match_testing'
        payload: { materialInventory: TMaterial; matchedRows: TRow[] }
    }
    | {
        action: 'error'
        errorKind: 'no_match' | 'api_error' | 'unknown_error'
        error?: unknown
    }

export type ScanDecisionOptions = {
    isTestingMode: boolean
    allowNoMatchInTesting?: boolean
}

export function decideMaterialScanAction<TMaterial, TRow>(
    result: ScanResultLike<TMaterial, TRow>,
    options: ScanDecisionOptions
): ScanDecision<TMaterial, TRow> {
    switch (result.status) {
        case 'success':
            return {
                action: 'matched',
                tone: 'success',
                messageKey: 'matched',
                payload: result.data,
            }
        case 'virtual_success':
            return {
                action: 'matched',
                tone: 'info',
                messageKey: 'virtual',
                payload: result.data,
            }
        case 'no_match_in_grid': {
            if (
                options.isTestingMode &&
                options.allowNoMatchInTesting &&
                result.data
            ) {
                return {
                    action: 'matched',
                    tone: 'info',
                    messageKey: 'no_match_testing',
                    payload: result.data,
                }
            }
            return { action: 'error', errorKind: 'no_match' }
        }
        case 'api_error':
            return { action: 'error', errorKind: 'api_error', error: result.error }
        case 'unknown_error':
            return {
                action: 'error',
                errorKind: 'unknown_error',
                error: result.error,
            }
    }
}
