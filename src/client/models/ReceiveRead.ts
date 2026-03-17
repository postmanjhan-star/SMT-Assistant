/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { ReceiveItemRead } from './ReceiveItemRead';
import type { ReceiveTypeEnum } from './ReceiveTypeEnum';

export type ReceiveRead = {
    id: number;
    idno: string;
    date: string;
    vendor_id: number;
    vendor_idno: string;
    vendor_name: string;
    vendor_shipping_idno: (string | null);
    memo: (string | null);
    purchase_idno: (string | null);
    employee_id: number;
    receive_items: Array<ReceiveItemRead>;
    st_receive_idno: (string | null);
    st_mbr_idno: (string | null);
    receive_day: string;
    receive_type: ReceiveTypeEnum;
    putaway_verification: boolean;
};

