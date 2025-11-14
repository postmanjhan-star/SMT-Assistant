/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { CheckMaterialMatchEnum } from './CheckMaterialMatchEnum';
import type { FeedMaterialTypeEnum } from './FeedMaterialTypeEnum';

export type PanasonicFeedRecordCreate = {
    stat_item_id: number;
    operator_id: (string | null);
    operation_time: string;
    slot_idno: string;
    sub_slot_idno: (string | null);
    material_pack_code: (string | null);
    feed_material_pack_type: (FeedMaterialTypeEnum | null);
    check_pack_code_match: (CheckMaterialMatchEnum | null);
};
