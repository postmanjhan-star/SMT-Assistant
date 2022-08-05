/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { Employee } from './Employee';
import type { IssuanceItem } from './IssuanceItem';
import type { L2Storage } from './L2Storage';

/**
 * Represents a Issuance record
 */
export type Issuance = {
    id: number;
    created_at: string;
    updated_at: string;
    idno: string;
    date: string;
    employee_id: number;
    employee?: Employee;
    to_l2_storage_id: number;
    to_l2_storage?: L2Storage;
    memo?: string;
    issuance_items?: Array<IssuanceItem>;
};