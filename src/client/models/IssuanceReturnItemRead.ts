/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { MaterialInventoryRecordRead } from './MaterialInventoryRecordRead';

export type IssuanceReturnItemRead = {
    id: number;
    issuance_return_id: number;
    material_inventory_records: (Array<MaterialInventoryRecordRead> | null);
    from_l2_storage_id: number;
    to_l2_storage_id: number;
    quantity: string;
};
