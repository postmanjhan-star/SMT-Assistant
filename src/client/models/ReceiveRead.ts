/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { ReceiveItemRead } from './ReceiveItemRead';

export type ReceiveRead = {
    id: number;
    idno: string;
    date: string;
    vendor_id: number;
    vendor_idno: string;
    vendor_name: string;
    vendor_shipping_idno?: string;
    memo?: string;
    purchase_idno?: string;
    employee_id: number;
    receive_items: Array<ReceiveItemRead>;
    st_receive_idno?: string;
    st_mbr_idno?: string;
};
