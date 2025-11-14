/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { CheckMaterialMatchEnum } from './CheckMaterialMatchEnum';
import type { ProduceTypeEnum } from './ProduceTypeEnum';

export type PanasonicMounterItemStatCreate = {
    operator_id: (string | null);
    operation_time: string;
    production_start: string;
    production_end?: (string | null);
    work_order_no: (string | null);
    product_idno: string;
    machine_idno: string;
    slot_idno: string;
    sub_slot_idno: (string | null);
    material_idno: (string | null);
    material_pack_code: (string | null);
    produce_mode: (ProduceTypeEnum | null);
    check_pack_code_match: (CheckMaterialMatchEnum | null);
};
