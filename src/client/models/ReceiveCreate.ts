/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { ReceiveItemCreate } from './ReceiveItemCreate';

export type ReceiveCreate = {
    vendor_id: number;
    st_mbr_idno?: string;
    purchase_idno?: string;
    st_record_idno?: string;
    st_receive_idno?: string;
    memo?: string;
    vendor_shipping_idno?: string;
    receive_items: Array<ReceiveItemCreate>;
};