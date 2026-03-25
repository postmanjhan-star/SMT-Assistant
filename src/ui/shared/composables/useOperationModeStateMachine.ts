import { computed, onUnmounted, shallowRef } from 'vue'
import { createActor } from 'xstate'
import { operationModeStateMachine } from '@/domain/mounter/operationModeStateMachine'
import type { UnloadModeType } from '@/domain/mounter/operationModeStateMachine'

export type { UnloadModeType }

export function useOperationModeStateMachine() {
  const actor = createActor(operationModeStateMachine).start()
  const snapshot = shallowRef(actor.getSnapshot())

  const unsubscribe = actor.subscribe((s) => {
    snapshot.value = s
  })

  onUnmounted(() => {
    unsubscribe.unsubscribe()
    actor.stop()
  })

  // ── Top-level state computeds ──────────────────────────────────
  const isNormal = computed(() => snapshot.value.matches("NORMAL"))
  const isIpqcMode = computed(() => snapshot.value.matches("IPQC"))
  const isUnloadMode = computed(() => snapshot.value.matches("UNLOAD"))

  // ── Unload sub-state computeds ────────────────────────────────
  const isUnloadScanPhase = computed(() =>
    snapshot.value.matches({ UNLOAD: "UNLOAD_SCAN" })
  )
  const isForceUnloadSlotPhase = computed(() =>
    snapshot.value.matches({ UNLOAD: "FORCE_SLOT_SCAN" })
  )
  const isReplaceMaterialPhase = computed(() =>
    snapshot.value.matches({ UNLOAD: "REPLACE_MATERIAL_SCAN" })
  )
  const isReplaceSlotPhase = computed(() =>
    snapshot.value.matches({ UNLOAD: "REPLACE_SLOT_SCAN" })
  )

  // ── Context accessors ─────────────────────────────────────────
  const unloadModeType = computed(() => snapshot.value.context.unloadModeType)
  const resolvedUnloadSlotIdno = computed(
    () => snapshot.value.context.resolvedUnloadSlotIdno
  )
  const replacementMaterialPackCode = computed(
    () => snapshot.value.context.replacementMaterialPackCode
  )

  // ── Send helpers ──────────────────────────────────────────────
  function enterUnloadMode(modeType: UnloadModeType) {
    actor.send({ type: "ENTER_UNLOAD", modeType })
  }

  function enterIpqcMode() {
    actor.send({ type: "ENTER_IPQC" })
  }

  function exitToNormal() {
    actor.send({ type: "EXIT_TO_NORMAL" })
  }

  function onUnloadSubmitted(resolvedSlotIdno: string) {
    actor.send({ type: "UNLOAD_SUBMITTED", resolvedSlotIdno })
  }

  function onForceUnloadSubmitted(resolvedSlotIdno: string) {
    actor.send({ type: "FORCE_UNLOAD_SUBMITTED", resolvedSlotIdno })
  }

  function onReplacementMaterialScanned(packCode: string) {
    actor.send({ type: "REPLACEMENT_MATERIAL_SCANNED", packCode })
  }

  function onReplaceSlotSubmitted() {
    actor.send({ type: "REPLACE_SLOT_SUBMITTED" })
  }

  return {
    // State
    isNormal,
    isIpqcMode,
    isUnloadMode,
    // Unload phases
    isUnloadScanPhase,
    isForceUnloadSlotPhase,
    isReplaceMaterialPhase,
    isReplaceSlotPhase,
    // Context
    unloadModeType,
    resolvedUnloadSlotIdno,
    replacementMaterialPackCode,
    // Transitions
    enterUnloadMode,
    enterIpqcMode,
    exitToNormal,
    onUnloadSubmitted,
    onForceUnloadSubmitted,
    onReplacementMaterialScanned,
    onReplaceSlotSubmitted,
  }
}

export type OperationModeStateMachine = ReturnType<typeof useOperationModeStateMachine>
