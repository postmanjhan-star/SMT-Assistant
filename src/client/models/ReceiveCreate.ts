/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { ReceiveItemCreate } from './ReceiveItemCreate';

export type ReceiveCreate = {
    vendor_id: number;
    vendor_shipping_idno?: string;
    memo?: string;
    purchase_idno?: string;
    st_receive_idno?: string;
    st_mbr_idno?: string;
    receive_items: Array<ReceiveItemCreate>;
};
