/**
 * Domain input interfaces — minimal structural contracts.
 * infra 傳入完整 client 型別，TypeScript structural typing 確保相容。
 * domain 層不持有任何 @/client 型別。
 */

export interface FujiMounterFileItemInput {
    id: number
    stage: string
    slot: number
    part_number: string
}

export interface FujiMounterFileInput {
    mounter_idno: string
    board_side: string
    fuji_mounter_file_items: FujiMounterFileItemInput[]
}

export interface FujiMounterItemStatInput {
    id: number
    slot_idno: string
    sub_slot_idno: string
    machine_idno: string
    board_side: string | null
    material_idno: string | null
    produce_mode?: string | null
    feed_records?: unknown[]
}

export interface FujiItemStatFeedLogInput {
    id: number
    feed_record_id: number
    slot_idno: string
    sub_slot_idno: string | null
    operation_time: string
    material_idno: string | null
    material_pack_code: string | null
    operation_type: string
    feed_material_pack_type: string | null
    check_pack_code_match: string | null
    operator_id: string | null
}

export interface PanasonicMounterItemStatInput {
    id: number
    slot_idno?: string | null
    sub_slot_idno?: string | null
    material_idno?: string | null
    feed_records?: unknown[]
}

export interface PanasonicItemStatFeedLogInput {
    id: number
    feed_record_id: number
    slot_idno: string
    sub_slot_idno: string | null
    operation_time: string
    material_idno: string | null
    material_pack_code: string | null
    operation_type: string | null
    feed_material_pack_type: string | null
    check_pack_code_match: string | null
    operator_id: string | null
    created_at: string
}

export interface PanasonicMounterFileItemInput {
    id?: number | null
    slot_idno?: string | null
    sub_slot_idno?: string | null
    smd_model_idno: string
}
