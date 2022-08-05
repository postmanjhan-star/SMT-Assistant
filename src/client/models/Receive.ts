/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { Employee } from './Employee';
import type { ReceiveItem } from './ReceiveItem';
import type { Vendor } from './Vendor';

/**
 * Represents a Receive record
 */
export type Receive = {
    id: number;
    created_at: string;
    updated_at: string;
    idno: string;
    date: string;
    vendor_id: number;
    vendor?: Vendor;
    vendor_shipping_idno?: string;
    employee_id: number;
    employee?: Employee;
    memo?: string;
    purchase_idno?: string;
    receive_items?: Array<ReceiveItem>;
    st_receive_idno?: string;
    st_record_idno?: string;
    st_mbr_idno?: string;
};