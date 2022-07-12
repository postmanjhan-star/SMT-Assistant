/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { ReceiveItemRead } from './ReceiveItemRead';

export type ReceiveRead = {
    date: string;
    st_recieve_idno?: string;
    id: number;
    st_mbr_idno?: string;
    idno: string;
    memo?: string;
    st_record_idno?: string;
    employee_id: number;
    vendor_id: number;
    vendor_shipping_idno?: string;
    purchase_idno?: string;
    vendor_idno: string;
    vendor_name: string;
    receive_items: Array<ReceiveItemRead>;
};