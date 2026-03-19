import { SlotSubmitContext } from "./SlotSubmitContext";
import { SlotSubmitStrategy } from "./SlotSubmitStrategy";
import { SlotSubmitDeps, type SlotSubmitBindingPort } from "./SlotSubmitDeps";
import { decideSlotBinding, formatSlotIdno, TESTING_FORCE_BIND_REMARK } from "@/domain/slot/SlotBindingRules";
import { MODE_NAME_TESTING } from "@/application/post-production-feed/PostProductionFeedConstants"

export class TestingModeStrategy implements SlotSubmitStrategy {
    constructor(private deps: SlotSubmitDeps) {}

    async submit(ctx: SlotSubmitContext): Promise<boolean> {
        const { store } = this.deps
        const grid =
            this.deps.grid ??
            (store.hasRow ? { hasRow: store.hasRow } : { hasRow: () => false })
        const fallbackBinding: SlotSubmitBindingPort = {
            applyMatch: () => false,
            applyMismatch: () => { },
            applyWarningBinding: () => false,
        }
        const storeBinding: SlotSubmitBindingPort | null =
            store.applyMatch
                ? {
                    applyMatch: store.applyMatch,
                    applyMismatch: store.applyMismatch ?? (() => { }),
                    applyWarningBinding:
                        store.applyWarningBinding ?? (() => false),
                }
                : null
        const binding: SlotSubmitBindingPort =
            this.deps.binding ?? storeBinding ?? fallbackBinding
        const resetInputs = this.deps.resetInputs ?? store.resetInputs ?? (() => {})
        const { result, slot, subSlot, slotIdno } = ctx

        if (!result) {
            store.setLastResult({ type: 'warn', message: '錯誤的槽位' })
            return false
        }

        const buildCandidates = (primary: string, raw: string) => {
            const candidates: string[] = []
            const add = (id?: string) => {
                if (!id) return
                if (!candidates.includes(id)) candidates.push(id)
            }

            add(primary)
            add(raw)

            for (const id of [...candidates]) {
                if (id.endsWith('-')) {
                    add(id.slice(0, -1))
                } else {
                    add(`${id}-`)
                }
            }

            return candidates
        }

        const matchedRows = result.matchedRows || []
        const formattedInputSlotIdno = formatSlotIdno({ slotIdno: slot, subSlotIdno: subSlot })
        const candidateIds = buildCandidates(formattedInputSlotIdno, slotIdno)
        let resolvedInputSlotIdno: string | null =
            candidateIds.find(id => grid.hasRow(id)) ?? null

        if (!resolvedInputSlotIdno) {
            const gridWithRows = this.deps.grid as { getAllRowsData?: () => any[] } | undefined
            const rows = gridWithRows?.getAllRowsData?.() ?? []
            const normalizedSlot = String(slot ?? '').trim()
            const normalizedSubSlot = String(subSlot ?? '').trim()
            const matchedRow = rows.find((row) => {
                const rowSlot = String(row?.slotIdno ?? '').trim()
                const rowSubSlot = String(row?.subSlotIdno ?? '').trim()
                return rowSlot === normalizedSlot && rowSubSlot === normalizedSubSlot
            })

            if (matchedRow) {
                resolvedInputSlotIdno = `${matchedRow.slotIdno}-${matchedRow.subSlotIdno ?? ''}`
            }
        }

        const finalInputSlotIdno = resolvedInputSlotIdno ?? formattedInputSlotIdno

        if (!grid.hasRow(finalInputSlotIdno)) {
            store.setLastResult({ type: 'error', message: `不存在槽位 ${slotIdno}` })
            return false
        }

        if (matchedRows.length > 0) {
            const bindingDecision = decideSlotBinding(
                { slotIdno: slot, subSlotIdno: subSlot },
                matchedRows
            )

            if (bindingDecision.kind === 'match') {
                const matchCandidates = buildCandidates(
                    bindingDecision.matchedSlotIdno,
                    bindingDecision.matchedSlotIdno
                )
                const matchedSlotIdno =
                    matchCandidates.find(id => grid.hasRow(id)) ??
                    bindingDecision.matchedSlotIdno

                if (!grid.hasRow(matchedSlotIdno)) {
                    store.setLastResult({ type: 'error', message: `槽位錯誤 ${slotIdno}` })
                    return false
                }

                const applied = binding.applyMatch(
                    matchedSlotIdno,
                    result.materialInventory ?? null,
                    { slot, subSlot }
                )

                if (!applied) {
                    store.setLastResult({ type: 'error', message: `槽位錯誤 ${slotIdno}` })
                    return false
                }

                resetInputs()
                store.setLastResult({
                    type: 'success',
                    message: `${MODE_NAME_TESTING}: 槽位 ${slotIdno} 綁定成功`,
                })
                return true
            }

            const suggestedSlot =
                bindingDecision.kind === 'mismatch'
                    ? bindingDecision.suggestedSlotIdno
                    : `${slot}-${subSlot}`

            binding.applyMismatch(
                { slot, subSlot },
                suggestedSlot,
                result.materialInventory?.idno ?? ''
            )

            store.setLastResult({
                type: 'error',
                message: `錯誤的槽位 ${slotIdno} ，此物料應放置於 ${suggestedSlot}`,
            })
            resetInputs()
            return false
        }

        const testRemark = TESTING_FORCE_BIND_REMARK
        const updated = binding.applyWarningBinding(
            finalInputSlotIdno,
            result.materialInventory ?? null,
            testRemark
        )

        if (!updated) {
            store.setLastResult({ type: 'error', message: `槽位不存在 ${slotIdno}` })
            return false
        }

        store.setLastResult({
            type: 'success',
            message: `${MODE_NAME_TESTING}: 槽位 ${slotIdno} 綁定成功 ${testRemark}`,
        })
        resetInputs()
        return true
    }
}
