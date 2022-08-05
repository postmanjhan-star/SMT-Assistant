/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { L1Storage } from './L1Storage';
import type { L2Storage } from './L2Storage';
import type { Receive } from './Receive';

/**
 * Represents a Vendor record
 */
export type Vendor = {
    id: number;
    created_at: string;
    updated_at: string;
    idno: string;
    name: string;
    tax_idno?: string;
    l1_storage_id?: number;
    l1_storage?: L1Storage;
    l2_storage_id?: number;
    l2_storage?: L2Storage;
    receives?: Array<Receive>;
};