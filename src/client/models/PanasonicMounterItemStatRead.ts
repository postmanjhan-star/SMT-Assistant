/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { BoardSideEnum } from './BoardSideEnum';
import type { MachineSideEnum } from './MachineSideEnum';
import type { PanasonicMounterItemFeedRecordRead } from './PanasonicMounterItemFeedRecordRead';
import type { ProduceTypeEnum } from './ProduceTypeEnum';

export type PanasonicMounterItemStatRead = {
    id: number;
    uuid: string;
    created_at: string;
    updated_at: (string | null);
    production_start: string;
    production_end: (string | null);
    work_order_no: (string | null);
    product_idno: string;
    machine_idno: string;
    machine_side: (MachineSideEnum | null);
    board_side: (BoardSideEnum | null);
    slot_idno?: string;
    sub_slot_idno?: (string | null);
    material_idno: (string | null);
    produce_mode: (ProduceTypeEnum | null);
    feed_records?: Array<PanasonicMounterItemFeedRecordRead>;
};

