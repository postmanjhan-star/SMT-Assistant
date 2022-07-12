/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { ReceiveItemCreate } from './ReceiveItemCreate';

export type ReceiveCreate = {
    st_record_idno?: string;
    vendor_id: number;
    st_recieve_idno?: string;
    st_mbr_idno?: string;
    vendor_shipping_idno?: string;
    purchase_idno?: string;
    memo?: string;
    receive_items: Array<ReceiveItemCreate>;
};