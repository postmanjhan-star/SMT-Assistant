/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { IssuanceItem } from './IssuanceItem';
import type { L1Storage } from './L1Storage';
import type { L2Storage } from './L2Storage';
import type { Material } from './Material';
import type { MaterialInventoryRecord } from './MaterialInventoryRecord';
import type { ReceiveItem } from './ReceiveItem';

/**
 * Represents a MaterialInventory record
 */
export type MaterialInventory = {
    id: number;
    created_at: string;
    updated_at: string;
    idno: string;
    material_id: number;
    material?: Material;
    material_inventory_records?: Array<MaterialInventoryRecord>;
    l1_storage_id: number;
    l1_storage?: L1Storage;
    l2_storage_id: number;
    l2_storage?: L2Storage;
    latest_qty: number;
    receive_item_id?: number;
    receive_item?: ReceiveItem;
    issuance_item?: Array<IssuanceItem>;
    st_barcode?: string;
};