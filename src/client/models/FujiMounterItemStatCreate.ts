/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { BoardSideEnum } from './BoardSideEnum';
import type { CheckMaterialMatchEnum } from './CheckMaterialMatchEnum';
import type { FeedMaterialTypeEnum } from './FeedMaterialTypeEnum';
import type { MachineSideEnum } from './MachineSideEnum';
import type { MaterialOperationTypeEnum } from './MaterialOperationTypeEnum';
import type { ProduceTypeEnum } from './ProduceTypeEnum';
import type { UnfeedMaterialTypeEnum } from './UnfeedMaterialTypeEnum';
import type { UnfeedReasonEnum } from './UnfeedReasonEnum';

export type FujiMounterItemStatCreate = {
    operator_id: (string | null);
    operation_time: string;
    production_start: string;
    production_end?: (string | null);
    work_order_no: (string | null);
    product_idno: string;
    machine_idno: string;
    machine_side?: (MachineSideEnum | null);
    board_side?: (BoardSideEnum | null);
    slot_idno: string;
    sub_slot_idno: string;
    material_idno: (string | null);
    material_pack_code: (string | null);
    produce_mode: (ProduceTypeEnum | null);
    operation_type?: MaterialOperationTypeEnum;
    feed_material_pack_type?: (FeedMaterialTypeEnum | null);
    unfeed_material_pack_type?: (UnfeedMaterialTypeEnum | null);
    unfeed_reason?: (UnfeedReasonEnum | null);
    check_pack_code_match: (CheckMaterialMatchEnum | null);
};

