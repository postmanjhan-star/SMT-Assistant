/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { InventoryChangeCauseEnum } from './InventoryChangeCauseEnum';
import type { L1Storage } from './L1Storage';
import type { L2Storage } from './L2Storage';
import type { Material } from './Material';
import type { MaterialInventory } from './MaterialInventory';

/**
 * Represents a MaterialInventoryRecord record
 */
export type MaterialInventoryRecord = {
    id: number;
    created_at: string;
    updated_at: string;
    date: string;
    material_id: number;
    material?: Material;
    material_inventory_id?: number;
    material_inventory?: MaterialInventory;
    l1_storage_id: number;
    l1_storage?: L1Storage;
    l2_storage_id: number;
    l2_storage?: L2Storage;
    delta_qty: number;
    cause: InventoryChangeCauseEnum;
};