/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { L2Storage } from './L2Storage';
import type { MaterialInventory } from './MaterialInventory';
import type { MaterialInventoryRecord } from './MaterialInventoryRecord';
import type { StorageTypeEnum } from './StorageTypeEnum';
import type { Vendor } from './Vendor';

/**
 * Represents a L1Storage record
 */
export type L1Storage = {
    id: number;
    created_at: string;
    updated_at: string;
    idno: string;
    name: string;
    type: StorageTypeEnum;
    l2_storages?: Array<L2Storage>;
    vendors?: Array<Vendor>;
    material_inventories?: Array<MaterialInventory>;
    material_inventory_records?: Array<MaterialInventoryRecord>;
};