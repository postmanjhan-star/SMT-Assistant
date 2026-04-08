import { computed, onUnmounted, shallowRef, watch } from 'vue'
import { createActor } from 'xstate'
import { operationModeStateMachine } from '@/domain/mounter/operationModeStateMachine'
import type { UnloadModeType } from '@/domain/mounter/operationModeStateMachine'
import { useAuthStore } from '@/stores/authStore'

export type { UnloadModeType }

export function useOperationModeStateMachine() {
  const actor = createActor(operationModeStateMachine).start()
  const snapshot = shallowRef(actor.getSnapshot())
  let stopped = false

  const unsubscribe = actor.subscribe((s) => {
    snapshot.value = s
  })

  // ── Auth bridging ──────────────────────────────────────────────
  const authStore = useAuthStore()

  // 初始化時若已登入，立即送 LOGGED_IN
  if (authStore.isLoggedIn) {
    actor.send({ type: "LOGGED_IN" })
  }

  // 監聽後續 isLoggedIn 變化
  watch(() => authStore.isLoggedIn, (loggedIn) => {
    if (stopped) return
    actor.send({ type: loggedIn ? "LOGGED_IN" : "LOGGED_OUT" })
  })

  onUnmounted(() => {
    stopped = true
    unsubscribe.unsubscribe()
    actor.stop()
  })

  // ── Top-level auth state computeds ────────────────────────────
  const isAuthenticated   = computed(() => snapshot.value.matches("AUTHENTICATED"))
  const isUnauthenticated = computed(() => snapshot.value.matches("UNAUTHENTICATED"))

  // ── Top-level operation state computeds ───────────────────────
  const isNormal     = computed(() => snapshot.value.matches({ AUTHENTICATED: "NORMAL" }))
  const isIpqcMode   = computed(() => snapshot.value.matches({ AUTHENTICATED: "IPQC" }))
  const isUnloadMode = computed(() => snapshot.value.matches({ AUTHENTICATED: "UNLOAD" }))
  const isSpliceMode = computed(() => snapshot.value.matches({ AUTHENTICATED: "SPLICE" }))

  // ── Unload sub-state computeds ────────────────────────────────
  const isUnloadScanPhase = computed(() =>
    snapshot.value.matches({ AUTHENTICATED: { UNLOAD: "UNLOAD_SCAN" } })
  )
  const isForceUnloadSlotPhase = computed(() =>
    snapshot.value.matches({ AUTHENTICATED: { UNLOAD: "FORCE_SLOT_SCAN" } })
  )
  const isReplaceMaterialPhase = computed(() =>
    snapshot.value.matches({ AUTHENTICATED: { UNLOAD: "REPLACE_MATERIAL_SCAN" } })
  )
  const isReplaceSlotPhase = computed(() =>
    snapshot.value.matches({ AUTHENTICATED: { UNLOAD: "REPLACE_SLOT_SCAN" } })
  )

  // ── Splice sub-state computeds ────────────────────────────────
  const isSpliceIdlePhase = computed(() =>
    snapshot.value.matches({ AUTHENTICATED: { SPLICE: "SPLICE_IDLE" } })
  )
  const isSpliceNewPhase = computed(() =>
    snapshot.value.matches({ AUTHENTICATED: { SPLICE: "SPLICE_NEW_SCAN" } })
  )
  const isSpliceSlotPhase = computed(() =>
    snapshot.value.matches({ AUTHENTICATED: { SPLICE: "SPLICE_SLOT_SCAN" } })
  )

  // ── Context accessors ─────────────────────────────────────────
  const unloadModeType = computed(() => snapshot.value.context.unloadModeType)
  const resolvedUnloadSlotIdno = computed(
    () => snapshot.value.context.resolvedUnloadSlotIdno
  )
  const replacementMaterialPackCode = computed(
    () => snapshot.value.context.replacementMaterialPackCode
  )
  const spliceSlotIdno = computed(() => snapshot.value.context.spliceSlotIdno)
  const spliceNewPackCode = computed(() => snapshot.value.context.spliceNewPackCode)

  // ── Send helpers ──────────────────────────────────────────────
  function onLoggedIn() {
    if (stopped) return
    actor.send({ type: "LOGGED_IN" })
  }

  function onLoggedOut() {
    if (stopped) return
    actor.send({ type: "LOGGED_OUT" })
  }

  function enterUnloadMode(modeType: UnloadModeType) {
    if (stopped) return
    actor.send({ type: "ENTER_UNLOAD", modeType })
  }

  function enterIpqcMode() {
    if (stopped) return
    actor.send({ type: "ENTER_IPQC" })
  }

  function enterSpliceMode() {
    if (stopped) return
    actor.send({ type: "ENTER_SPLICE" })
  }

  function exitToNormal() {
    if (stopped) return
    actor.send({ type: "EXIT_TO_NORMAL" })
  }

  function onUnloadSubmitted(resolvedSlotIdno: string) {
    if (stopped) return
    actor.send({ type: "UNLOAD_SUBMITTED", resolvedSlotIdno })
  }

  function onForceUnloadSubmitted(resolvedSlotIdno: string) {
    if (stopped) return
    actor.send({ type: "FORCE_UNLOAD_SUBMITTED", resolvedSlotIdno })
  }

  function onReplacementMaterialScanned(packCode: string) {
    if (stopped) return
    actor.send({ type: "REPLACEMENT_MATERIAL_SCANNED", packCode })
  }

  function onReplaceSlotSubmitted() {
    if (stopped) return
    actor.send({ type: "REPLACE_SLOT_SUBMITTED" })
  }

  function onSpliceCurrentScanned(resolvedSlotIdno: string) {
    if (stopped) return
    actor.send({ type: "SPLICE_CURRENT_SCANNED", resolvedSlotIdno })
  }

  function onSpliceNewScanned(packCode: string) {
    if (stopped) return
    actor.send({ type: "SPLICE_NEW_SCANNED", packCode })
  }

  function onSpliceSlotSubmitted() {
    if (stopped) return
    actor.send({ type: "SPLICE_SLOT_SUBMITTED" })
  }

  return {
    // Auth state
    isAuthenticated,
    isUnauthenticated,
    // Operation state
    isNormal,
    isIpqcMode,
    isUnloadMode,
    isSpliceMode,
    // Unload phases
    isUnloadScanPhase,
    isForceUnloadSlotPhase,
    isReplaceMaterialPhase,
    isReplaceSlotPhase,
    // Splice phases
    isSpliceIdlePhase,
    isSpliceNewPhase,
    isSpliceSlotPhase,
    // Context
    unloadModeType,
    resolvedUnloadSlotIdno,
    replacementMaterialPackCode,
    spliceSlotIdno,
    spliceNewPackCode,
    // Auth transitions
    onLoggedIn,
    onLoggedOut,
    // Operation transitions
    enterUnloadMode,
    enterIpqcMode,
    enterSpliceMode,
    exitToNormal,
    onUnloadSubmitted,
    onForceUnloadSubmitted,
    onReplacementMaterialScanned,
    onReplaceSlotSubmitted,
    onSpliceCurrentScanned,
    onSpliceNewScanned,
    onSpliceSlotSubmitted,
  }
}

export type OperationModeStateMachine = ReturnType<typeof useOperationModeStateMachine>
