/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { Issuance } from './Issuance';
import type { MaterialInventory } from './MaterialInventory';

/**
 * Represents a IssuanceItem record
 */
export type IssuanceItem = {
    id: number;
    created_at: string;
    updated_at: string;
    issuance_id: number;
    issuance?: Issuance;
    material_inventory_id: number;
    material_inventory?: MaterialInventory;
    issue_qty: number;
    lend_qty: number;
};