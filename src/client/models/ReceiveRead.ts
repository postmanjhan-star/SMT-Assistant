/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { ReceiveItemRead } from './ReceiveItemRead';

export type ReceiveRead = {
    idno: string;
    vendor_id: number;
    st_mbr_idno?: string;
    date: string;
    st_record_idno?: string;
    st_receive_idno?: string;
    memo?: string;
    employee_id: number;
    purchase_idno?: string;
    vendor_shipping_idno?: string;
    id: number;
    vendor_idno: string;
    vendor_name: string;
    receive_items: Array<ReceiveItemRead>;
};