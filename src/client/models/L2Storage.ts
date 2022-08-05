/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { Issuance } from './Issuance';
import type { L1Storage } from './L1Storage';
import type { MaterialInventory } from './MaterialInventory';
import type { MaterialInventoryRecord } from './MaterialInventoryRecord';
import type { Vendor } from './Vendor';

/**
 * Represents a L2Storage record
 */
export type L2Storage = {
    id: number;
    created_at: string;
    updated_at: string;
    idno: string;
    name: string;
    l1_storage?: L1Storage;
    l1_storage_id: number;
    vendor?: Vendor;
    material_inventories?: Array<MaterialInventory>;
    material_inventory_records?: Array<MaterialInventoryRecord>;
    issuances?: Array<Issuance>;
};