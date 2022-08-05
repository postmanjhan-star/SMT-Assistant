/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { Material } from './Material';
import type { MaterialInventory } from './MaterialInventory';
import type { Receive } from './Receive';

/**
 * Represents a ReceiveItem record
 */
export type ReceiveItem = {
    id: number;
    created_at: string;
    updated_at: string;
    receive_id: number;
    receive?: Receive;
    material_id: number;
    material?: Material;
    total_qty: number;
    qualify_qty: number;
    material_inventories?: Array<MaterialInventory>;
    st_barcodes?: string;
};