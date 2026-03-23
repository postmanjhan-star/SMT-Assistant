/* eslint-disable no-restricted-imports -- [Phase-1 whitelist] tracked in REFACTORING_BASELINE.md, fix in Phase 2 (Domain 純化) */
import type {
    CheckMaterialMatchEnum,
    FeedMaterialTypeEnum,
    PanasonicFeedRecordCreate,
} from "@/client"

export type RollShortageInput = {
    materialInventoryIdno: string
    slotIdno: string
    type: string
}

export type RollShortageValidation =
    | { ok: true }
    | {
          ok: false
          error:
              | "materialInventoryIdno_required"
              | "slotIdno_required"
              | "type_required"
      }

export type ParsedSlotId = {
    slotIdno: string
    subSlotIdno: string
}

export type RollShortagePayloadInput = {
    statId: number
    operatorId?: string | null
    operationTime: string
    slotIdno: string
    subSlotIdno?: string | null
    materialPackCode: string
    feedMaterialPackType: string | null
    checkPackCodeMatch?: string | null
}

export function validateInput(
    input: RollShortageInput
): RollShortageValidation {
    if (!input.materialInventoryIdno?.trim()) {
        return { ok: false, error: "materialInventoryIdno_required" }
    }

    if (!input.slotIdno?.trim()) {
        return { ok: false, error: "slotIdno_required" }
    }

    if (!input.type?.trim()) {
        return { ok: false, error: "type_required" }
    }

    return { ok: true }
}

export function parseSlotIdno(raw: string): ParsedSlotId {
    const trimmed = raw.trim()
    const [slotIdno, subSlotIdno = ""] = trimmed.split("-")
    return {
        slotIdno,
        subSlotIdno,
    }
}

export function appendMaterialInventoryIdno(
    existing: string | null | undefined,
    nextIdno: string
): string {
    const oldValue = existing?.trim() || ""
    return oldValue ? `${oldValue}, ${nextIdno}` : nextIdno
}

export function toCheckMaterialMatch(
    value: string | null | undefined
): CheckMaterialMatchEnum | null {
    if (value == null) return null
    return value as unknown as CheckMaterialMatchEnum
}

export function toFeedMaterialType(
    value: string | null | undefined
): FeedMaterialTypeEnum | null {
    if (value == null) return null
    return value as unknown as FeedMaterialTypeEnum
}

export function buildPanasonicFeedRecord(
    input: RollShortagePayloadInput
): PanasonicFeedRecordCreate {
    return {
        stat_item_id: input.statId,
        operator_id: input.operatorId ?? "",
        operation_time: input.operationTime,
        slot_idno: input.slotIdno,
        sub_slot_idno: input.subSlotIdno ?? null,
        material_pack_code: input.materialPackCode,
        feed_material_pack_type: toFeedMaterialType(input.feedMaterialPackType),
        check_pack_code_match: toCheckMaterialMatch(input.checkPackCodeMatch),
    }
}

export const RollShortagePolicy = {
    validateInput,
    parseSlotIdno,
    appendMaterialInventoryIdno,
    toCheckMaterialMatch,
    toFeedMaterialType,
    buildPanasonicFeedRecord,
}
