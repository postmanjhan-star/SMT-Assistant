/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { BoardSideEnum } from './BoardSideEnum';
import type { CheckMaterialMatchEnum } from './CheckMaterialMatchEnum';
import type { FeedMaterialTypeEnum } from './FeedMaterialTypeEnum';
import type { MachineSideEnum } from './MachineSideEnum';
import type { ProduceTypeEnum } from './ProduceTypeEnum';

export type PanasonicItemStatFeedLogRead = {
    id: number;
    created_at: string;
    feed_record_id: number;
    operator_id: (string | null);
    operation_time: string;
    machine_idno: string;
    machine_side: (MachineSideEnum | null);
    board_side: (BoardSideEnum | null);
    material_idno: (string | null);
    material_pack_code: string;
    feed_material_pack_type: (FeedMaterialTypeEnum | null);
    slot_idno: string;
    sub_slot_idno: string;
    stat_uuid: string;
    produce_mode: ProduceTypeEnum;
    check_pack_code_match: (CheckMaterialMatchEnum | null);
};
