/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { MaterialInventory } from './MaterialInventory';
import type { MaterialInventoryRecord } from './MaterialInventoryRecord';
import type { ReceiveItem } from './ReceiveItem';
import type { UnitEnum } from './UnitEnum';

/**
 * Represents a Material record
 */
export type Material = {
    id: number;
    created_at: string;
    updated_at: string;
    idno: string;
    name?: string;
    description?: string;
    unit: UnitEnum;
    qty_per_pack: number;
    expiry_days: number;
    receive_items?: Array<ReceiveItem>;
    inventories?: Array<MaterialInventory>;
    inventory_records?: Array<MaterialInventoryRecord>;
};