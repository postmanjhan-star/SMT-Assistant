/* eslint-disable no-restricted-imports -- [Phase-1 whitelist] tracked in REFACTORING_BASELINE.md, fix in Phase 3 */
import { computed, nextTick, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { ColumnApi, GridApi } from 'ag-grid-community'
import { SmtService } from '@/client'
import { resolveMaterialLookupError } from '@/domain/material/MaterialLookupError'
import {
  MATERIAL_UNLOAD_TRIGGER,
  MATERIAL_FORCE_UNLOAD_TRIGGER,
  MATERIAL_EXIT_TRIGGER,
  MATERIAL_IPQC_TRIGGER,
  USER_SWITCH_TRIGGER,
  MATERIAL_UNLOAD_MODE_NAME,
  MATERIAL_FORCE_UNLOAD_MODE_NAME,
  MATERIAL_IPQC_MODE_NAME,
  MATERIAL_FEED_MODE_NAME,
} from '@/domain/mounter/operationModes'
import { parsePanasonicSlotIdno } from '@/domain/slot/PanasonicSlotParser'
import { useOperationModeStateMachine } from '@/ui/shared/composables/useOperationModeStateMachine'
import { msg } from '@/ui/shared/messageCatalog'
import type { UnloadModeType } from '@/ui/shared/composables/useOperationModeStateMachine'

// GridApi has private class members that break Ref<T> assignability, so we
// use a structural Pick of only the methods we actually call.
type GridApiRef   = Ref<Pick<GridApi,    'applyTransaction'> | null>
type ColumnApiRef = Ref<Pick<ColumnApi, 'setColumnVisible'> | null>

// ─────────────────────────────────────────────────────────────────────────────
// Options
// ─────────────────────────────────────────────────────────────────────────────

export type PanasonicProductionOperationFlowsOptions = {
  rowData:         Ref<any[]>
  gridApi:         GridApiRef
  columnApi:       ColumnApiRef
  currentUsername: ComputedRef<string | null>
  isTestingMode:   Ref<boolean>
  isMockMode:      boolean
  showError:             (msg: string) => void
  showSuccess:           (msg: string) => void
  handleUserSwitchTrigger: (code: string) => boolean
  clearNormalScanState:  () => void
  focusMaterialInput:    () => void
  // 即時 API（從 usePanasonicProductionPage 注入）
  submitUnload: (params: { materialPackCode: string; slotIdno: string }) => Promise<boolean>
  submitForceUnloadBySlot: (params: { slotIdno: string; unfeedReason?: string | null }) => Promise<{ ok: boolean; slotIdno?: string }>
  findUniqueUnloadSlotByPackCode: (materialPackCode: string) => { ok: true; slotIdno: string } | { ok: false; error: string }
  validateUnloadMaterialPackCode: (code: string) => Promise<boolean>
  validateReplacementMaterialForSlot: (params: { materialPackCode: string; slotIdno: string }) => Promise<boolean>
  submitReplace: (params: { materialPackCode: string; slotIdno: string }) => Promise<boolean>
  inspectionUpload: (params: {
    statId: number
    slotIdno: string
    subSlotIdno: string | null
    materialPackCode: string
    operatorIdno: string | null
  }) => Promise<void>
}

// ─────────────────────────────────────────────────────────────────────────────
// Composable
// ─────────────────────────────────────────────────────────────────────────────

export function usePanasonicProductionOperationFlows(options: PanasonicProductionOperationFlowsOptions) {
  const machine = useOperationModeStateMachine()

  const {
    isUnloadMode,
    isIpqcMode,
    isUnloadScanPhase,
    isForceUnloadSlotPhase,
    isReplaceMaterialPhase,
    isReplaceSlotPhase,
    unloadModeType,
    resolvedUnloadSlotIdno,
    replacementMaterialPackCode,
  } = machine

  // ── Input values (v-model) ────────────────────────────────────
  const unloadMaterialValue = ref('')
  const unloadSlotValue = ref('')
  const ipqcMaterialValue = ref('')
  const ipqcSlotValue = ref('')

  // ── Input DOM refs ────────────────────────────────────────────
  const unloadMaterialInput = ref<HTMLInputElement | null>(null)
  const unloadSlotInput = ref<HTMLInputElement | null>(null)
  const ipqcMaterialInput = ref<HTMLInputElement | null>(null)
  const ipqcSlotInput = ref<HTMLInputElement | null>(null)

  // ── IPQC saved states ─────────────────────────────────────────
  const ipqcSavedCorrectStates = ref<Map<string, string | null>>(new Map())

  // ── UI helper computeds ───────────────────────────────────────

  const operationModeName = computed(() => {
    if (isUnloadMode.value) {
      return unloadModeType.value === 'force_single_slot'
        ? MATERIAL_FORCE_UNLOAD_MODE_NAME
        : MATERIAL_UNLOAD_MODE_NAME
    }
    if (isIpqcMode.value) return MATERIAL_IPQC_MODE_NAME
    return MATERIAL_FEED_MODE_NAME
  })

  const unloadMaterialLabel = computed(() => {
    if (isUnloadScanPhase.value) return '卸除捲號（自動定位）'
    if (isReplaceMaterialPhase.value) return '更換捲號'
    return '更換捲號（待掃站位）'
  })

  const unloadMaterialPlaceholder = computed(() => {
    if (isUnloadScanPhase.value) return '請掃描要卸除的捲號'
    if (isForceUnloadSlotPhase.value) return '請先掃描站位進行強制卸除'
    if (isReplaceMaterialPhase.value) return '請掃描要更換的捲號'
    return replacementMaterialPackCode.value
  })

  const hasUnloadMaterial = computed(() => {
    if (isReplaceSlotPhase.value) return replacementMaterialPackCode.value.trim().length > 0
    return unloadMaterialValue.value.trim().length > 0
  })

  const isUnloadMaterialInputDisabled = computed(
    () => isReplaceSlotPhase.value || isForceUnloadSlotPhase.value
  )

  const isUnloadSlotInputDisabled = computed(() => {
    if (isForceUnloadSlotPhase.value) return false
    if (isReplaceSlotPhase.value) return !hasUnloadMaterial.value
    return true
  })

  const unloadSlotLabel = computed(() =>
    isForceUnloadSlotPhase.value ? '卸除站位' : '站位編號'
  )

  const unloadSlotPlaceholder = computed(() => {
    if (isForceUnloadSlotPhase.value) return '請掃描要卸除的站位'
    if (isReplaceSlotPhase.value) return `請掃描原卸料站位 ${resolvedUnloadSlotIdno.value || ''}`
    return '請先掃描更換捲號'
  })

  // ── Focus helpers ─────────────────────────────────────────────

  function focusUnloadMaterialInput() {
    nextTick(() => unloadMaterialInput.value?.focus())
  }

  function focusUnloadSlotInput() {
    nextTick(() => unloadSlotInput.value?.focus())
  }

  function focusByCurrentPhase() {
    if (isForceUnloadSlotPhase.value || isReplaceSlotPhase.value) {
      focusUnloadSlotInput()
    } else {
      focusUnloadMaterialInput()
    }
  }

  function focusIpqcMaterialInput() {
    nextTick(() => ipqcMaterialInput.value?.focus())
  }

  function focusIpqcSlotInput() {
    nextTick(() => ipqcSlotInput.value?.focus())
  }

  // ── Grid helpers ──────────────────────────────────────────────

  const NORMAL_COLS = ['materialInventoryIdno', 'operatorIdno', 'operationTime']
  const IPQC_COLS   = ['inspectMaterialPackCode', 'inspectTime', 'inspectorIdno', 'inspectCount']

  function showIpqcColumns(visible: boolean) {
    const api = options.columnApi.value
    if (!api) return
    IPQC_COLS.forEach(col   => { try { api.setColumnVisible(col, visible)  } catch { /* no-op */ } })
    NORMAL_COLS.forEach(col => { try { api.setColumnVisible(col, !visible) } catch { /* no-op */ } })
  }

  function isBarcodeAlreadyInGrid(barcode: string): boolean {
    return options.rowData.value.some((row: any) => {
      if (String(row.materialInventoryIdno ?? '').trim() === barcode) return true
      const appended = String(row.appendedMaterialInventoryIdno ?? '').trim()
      return appended.split(',').some((c: string) => c.trim() === barcode)
    })
  }

  // ── Slot helpers ──────────────────────────────────────────────

  function toCanonicalPanasonicSlot(raw: string): string | null {
    const parsed = parsePanasonicSlotIdno(raw)
    if (!parsed) return null
    const slot    = String(parsed.slot    ?? '').trim()
    const subSlot = String(parsed.subSlot ?? '').trim().toUpperCase()
    if (!slot) return null
    return subSlot ? `${slot}-${subSlot}` : slot
  }

  function findRowBySlotIdno(slotIdno: string): any | null {
    const parsed = parsePanasonicSlotIdno(slotIdno)
    if (!parsed) return null
    return (options.rowData.value ?? []).find(
      (row: any) =>
        String(row.slotIdno    ?? '').trim() === String(parsed.slot    ?? '').trim() &&
        String(row.subSlotIdno ?? '').trim() === String(parsed.subSlot ?? '').trim()
    ) ?? null
  }

  function parseAppendedCodes(value: string | null | undefined): string[] {
    const raw = String(value ?? '').trim()
    if (!raw) return []
    return raw.split(',').map((code) => code.trim()).filter((code) => code.length > 0)
  }

  function getCurrentPackCode(row: any): string {
    const appended = parseAppendedCodes(row.appendedMaterialInventoryIdno)
    if (appended.length > 0) return appended[appended.length - 1]
    return String(row.materialInventoryIdno ?? '').trim()
  }

  // ── Mode entry/exit ───────────────────────────────────────────

  function enterUnloadMode(modeType: UnloadModeType) {
    machine.enterUnloadMode(modeType)
    unloadMaterialValue.value = ''
    unloadSlotValue.value = ''
    options.clearNormalScanState()
    nextTick(() => focusByCurrentPhase())
  }

  function exitUnloadMode() {
    machine.exitToNormal()
    unloadMaterialValue.value = ''
    unloadSlotValue.value = ''
    options.clearNormalScanState()
    options.focusMaterialInput()
  }

  function enterIpqcMode() {
    machine.enterIpqcMode()
    options.clearNormalScanState()

    const saved = new Map<string, string | null>()
    for (const row of options.rowData.value) {
      const key = `${row.slotIdno}-${row.subSlotIdno ?? ''}`
      saved.set(key, row.correct as string | null)
      row.correct = 'UNLOADED_MATERIAL_PACK'
    }
    ipqcSavedCorrectStates.value = saved

    options.gridApi.value?.applyTransaction?.({ update: [...options.rowData.value] })

    showIpqcColumns(true)
    focusIpqcMaterialInput()
  }

  function exitIpqcMode() {
    machine.exitToNormal()
    for (const row of options.rowData.value) {
      const key = `${row.slotIdno}-${row.subSlotIdno ?? ''}`
      const saved = ipqcSavedCorrectStates.value.get(key)
      if (saved !== undefined) {
        row.correct = saved
      }
    }
    ipqcSavedCorrectStates.value.clear()

    options.gridApi.value?.applyTransaction?.({ update: [...options.rowData.value] })

    showIpqcColumns(false)
    ipqcMaterialValue.value = ''
    ipqcSlotValue.value = ''
    options.clearNormalScanState()
    options.focusMaterialInput()
  }

  function toggleIpqcMode() {
    if (isIpqcMode.value) {
      exitIpqcMode()
      return
    }
    enterIpqcMode()
  }

  // ── IPQC handlers ─────────────────────────────────────────────

  async function handleIpqcMaterialSubmit() {
    const materialPackCode = ipqcMaterialValue.value.trim()
    if (!materialPackCode) return

    const code = materialPackCode.toUpperCase()
    if (code === MATERIAL_EXIT_TRIGGER || code === MATERIAL_IPQC_TRIGGER) {
      exitIpqcMode()
      ipqcMaterialValue.value = ''
      return
    }
    if (code === USER_SWITCH_TRIGGER) {
      exitIpqcMode()
      options.handleUserSwitchTrigger(code)
      ipqcMaterialValue.value = ''
      return
    }
    if (code === MATERIAL_UNLOAD_TRIGGER || code === MATERIAL_FORCE_UNLOAD_TRIGGER) {
      exitIpqcMode()
      ipqcMaterialValue.value = ''
      enterUnloadMode(code === MATERIAL_FORCE_UNLOAD_TRIGGER ? 'force_single_slot' : 'pack_auto_slot')
      return
    }

    // ERP 驗證（不跳過 testing mode，僅跳過 mock mode）
    if (!options.isMockMode) {
      try {
        await SmtService.getMaterialInventoryForSmt({ materialInventoryIdno: materialPackCode })
      } catch (error) {
        options.showError(resolveMaterialLookupError(error))
        ipqcMaterialValue.value = ''
        focusIpqcMaterialInput()
        return
      }
    }

    ipqcMaterialValue.value = materialPackCode
    options.showSuccess(msg.ipqc.materialScanned(materialPackCode))
    focusIpqcSlotInput()
  }

  async function handleIpqcSlotSubmit() {
    const slotIdno = ipqcSlotValue.value.trim()
    if (!slotIdno) return

    const code = slotIdno.toUpperCase()
    if (code === MATERIAL_EXIT_TRIGGER || code === MATERIAL_IPQC_TRIGGER) {
      exitIpqcMode()
      ipqcSlotValue.value = ''
      return
    }

    const materialPackCode = ipqcMaterialValue.value.trim()
    const row = findRowBySlotIdno(slotIdno)
    if (!row) {
      options.showError(`找不到槽位 ${slotIdno}`)
      ipqcSlotValue.value = ''
      focusIpqcSlotInput()
      return
    }

    const currentPackCode = getCurrentPackCode(row)
    if (materialPackCode !== currentPackCode) {
      options.showError(`料號不符：掃描 ${materialPackCode}，槽位應為 ${currentPackCode}`)
      ipqcSlotValue.value = ''
      ipqcMaterialValue.value = ''
      focusIpqcMaterialInput()
      return
    }

    // 標記已巡檢 ✅
    row.correct = 'MATCHED_MATERIAL_PACK'
    row.inspectMaterialPackCode = materialPackCode
    row.inspectTime = new Date().toISOString()
    row.inspectCount = (row.inspectCount ?? 0) + 1
    row.inspectorIdno = options.currentUsername.value || null
    row.remark = `巡檢 ${row.inspectCount} 次`

    options.gridApi.value?.applyTransaction?.({ update: [row] })

    // 即時上傳（失敗不影響 UI）
    if (row.id) {
      try {
        await options.inspectionUpload({
          statId: row.id,
          slotIdno: String(row.slotIdno),
          subSlotIdno: row.subSlotIdno ?? null,
          materialPackCode,
          operatorIdno: options.currentUsername.value,
        })
      } catch {
        // silent
      }
    }

    options.showSuccess(msg.ipqc.inspectionSuccess(materialPackCode, slotIdno))
    ipqcSlotValue.value = ''
    ipqcMaterialValue.value = ''
    focusIpqcMaterialInput()
  }

  // ── Mode trigger handlers ─────────────────────────────────────

  function handleModeTriggerFromNormalInput(code: string): boolean {
    if (options.handleUserSwitchTrigger(code)) return true
    if (code === MATERIAL_UNLOAD_TRIGGER) {
      if (isIpqcMode.value) exitIpqcMode()
      enterUnloadMode('pack_auto_slot')
      return true
    }
    if (code === MATERIAL_FORCE_UNLOAD_TRIGGER) {
      if (isIpqcMode.value) exitIpqcMode()
      enterUnloadMode('force_single_slot')
      return true
    }
    if (code === MATERIAL_IPQC_TRIGGER) {
      toggleIpqcMode()
      return true
    }
    if (code === MATERIAL_EXIT_TRIGGER && isIpqcMode.value) {
      exitIpqcMode()
      return true
    }
    return false
  }

  function handleModeTriggerFromUnloadInput(code: string): boolean {
    if (code === MATERIAL_IPQC_TRIGGER) {
      exitUnloadMode()
      enterIpqcMode()
      return true
    }
    if (code === MATERIAL_EXIT_TRIGGER) {
      exitUnloadMode()
      return true
    }
    if (code === MATERIAL_UNLOAD_TRIGGER || code === MATERIAL_FORCE_UNLOAD_TRIGGER) {
      exitUnloadMode()
      return true
    }
    return false
  }

  function handleBeforeMaterialScan(barcode: string): boolean {
    const trimmed = barcode.trim()
    const code = trimmed.toUpperCase()
    if (handleModeTriggerFromNormalInput(code)) return false
    if (!isIpqcMode.value && isBarcodeAlreadyInGrid(trimmed)) {
      options.showError('重複掃描：此條碼已存在於目前站位資料')
      return false
    }
    return true
  }

  function handleBeforeSlotSubmit(raw: string): boolean {
    const code = raw.trim().toUpperCase()
    return !handleModeTriggerFromNormalInput(code)
  }

  // ── Unload workflow handlers ──────────────────────────────────

  async function handleUnloadMaterialSubmit(materialPackCode: string) {
    const resolved = options.findUniqueUnloadSlotByPackCode(materialPackCode)
    if (resolved.ok === false) {
      options.showError(resolved.error)
      unloadMaterialValue.value = ''
      focusUnloadMaterialInput()
      return
    }

    const isValidPackCode = options.isMockMode || await options.validateUnloadMaterialPackCode(materialPackCode)
    if (!isValidPackCode) {
      unloadMaterialValue.value = ''
      focusUnloadMaterialInput()
      return
    }

    const success = await options.submitUnload({
      materialPackCode,
      slotIdno: resolved.slotIdno,
    })

    unloadMaterialValue.value = ''
    if (!success) {
      focusUnloadMaterialInput()
      return
    }

    machine.onUnloadSubmitted(resolved.slotIdno)
    focusUnloadMaterialInput()
  }

  async function handleForceUnloadSlotSubmit(slotIdno: string) {
    const result = await options.submitForceUnloadBySlot({
      slotIdno,
      unfeedReason: 'WRONG_MATERIAL',
    })

    unloadSlotValue.value = ''
    if (!result.ok) {
      focusUnloadSlotInput()
      return
    }

    machine.onForceUnloadSubmitted(result.slotIdno ?? slotIdno)
    focusUnloadMaterialInput()
  }

  async function handleReplacementMaterialSubmit(materialPackCode: string) {
    const targetSlotIdno = resolvedUnloadSlotIdno.value.trim()
    if (!targetSlotIdno) {
      options.showError('找不到卸料站位，請重新掃描')
      machine.enterUnloadMode(unloadModeType.value)
      unloadMaterialValue.value = ''

      if (isForceUnloadSlotPhase.value) {
        focusUnloadSlotInput()
      } else {
        focusUnloadMaterialInput()
      }
      return
    }

    const canReplace = options.isMockMode || await options.validateReplacementMaterialForSlot({
      materialPackCode,
      slotIdno: targetSlotIdno,
    })

    unloadMaterialValue.value = ''
    if (!canReplace) {
      focusUnloadMaterialInput()
      return
    }

    machine.onReplacementMaterialScanned(materialPackCode)
    unloadSlotValue.value = ''
    focusUnloadSlotInput()
  }

  function handleUnloadMaterialEnter() {
    const material = unloadMaterialValue.value.trim()
    unloadMaterialValue.value = material
    if (!material) return

    if (handleModeTriggerFromUnloadInput(material.toUpperCase())) return

    if (isUnloadScanPhase.value) {
      void handleUnloadMaterialSubmit(material)
      return
    }

    if (isReplaceMaterialPhase.value) {
      void handleReplacementMaterialSubmit(material)
    }
  }

  async function handleUnloadSlotSubmit() {
    if (!isUnloadMode.value) return

    const slotIdno = unloadSlotValue.value.trim()
    const slotCommand = slotIdno.toUpperCase()
    const targetSlotIdno = resolvedUnloadSlotIdno.value.trim()
    const replacementPackCode = replacementMaterialPackCode.value.trim()

    if (!slotIdno) {
      options.showError('請輸入站位')
      focusUnloadSlotInput()
      return
    }

    if (handleModeTriggerFromUnloadInput(slotCommand)) return

    if (isForceUnloadSlotPhase.value) {
      void handleForceUnloadSlotSubmit(slotIdno)
      return
    }

    if (!isReplaceSlotPhase.value) {
      focusUnloadSlotInput()
      return
    }

    const normalizedInput  = toCanonicalPanasonicSlot(slotIdno)
    const normalizedTarget = toCanonicalPanasonicSlot(targetSlotIdno)
    if (!normalizedInput || !normalizedTarget || normalizedInput !== normalizedTarget) {
      options.showError(`請掃描原卸料站位 ${targetSlotIdno}`)
      unloadSlotValue.value = ''
      focusUnloadSlotInput()
      return
    }

    if (!replacementPackCode) {
      options.showError('找不到更換捲號，請重新掃描')
      machine.enterUnloadMode(unloadModeType.value)
      focusUnloadMaterialInput()
      return
    }

    const success = await options.submitReplace({
      materialPackCode: replacementPackCode,
      slotIdno: targetSlotIdno,
    })

    unloadSlotValue.value = ''
    if (!success) {
      focusUnloadSlotInput()
      return
    }

    exitUnloadMode()
  }

  // ── Return ────────────────────────────────────────────────────

  return {
    // Machine state
    isUnloadMode,
    isIpqcMode,
    isUnloadScanPhase,
    isForceUnloadSlotPhase,
    isReplaceMaterialPhase,
    isReplaceSlotPhase,
    unloadModeType,
    resolvedUnloadSlotIdno,
    replacementMaterialPackCode,
    // UI helpers
    operationModeName,
    unloadMaterialLabel,
    unloadMaterialPlaceholder,
    hasUnloadMaterial,
    isUnloadMaterialInputDisabled,
    isUnloadSlotInputDisabled,
    unloadSlotLabel,
    unloadSlotPlaceholder,
    // Input values
    unloadMaterialValue,
    unloadSlotValue,
    ipqcMaterialValue,
    ipqcSlotValue,
    // Input DOM refs
    unloadMaterialInput,
    unloadSlotInput,
    ipqcMaterialInput,
    ipqcSlotInput,
    // Handlers
    enterUnloadMode,
    exitUnloadMode,
    exitIpqcMode,
    toggleIpqcMode,
    handleBeforeMaterialScan,
    handleBeforeSlotSubmit,
    handleUnloadMaterialEnter,
    handleUnloadSlotSubmit,
    handleIpqcMaterialSubmit,
    handleIpqcSlotSubmit,
  }
}
