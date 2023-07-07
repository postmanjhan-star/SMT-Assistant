/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { InventoryChangeCauseEnum } from './InventoryChangeCauseEnum';

export type MaterialInventoryRecordRead = {
    id: number;
    date: string;
    material_id: number;
    material_inventory_id?: number;
    l1_storage_id: number;
    l2_storage_id: number;
    delta_qty: number;
    cause: InventoryChangeCauseEnum;
    issuance_item_id?: number;
};
