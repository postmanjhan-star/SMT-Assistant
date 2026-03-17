/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { ReceiveItemCreate } from './ReceiveItemCreate';

export type ReceiveCreate = {
    vendor_id: number;
    vendor_shipping_idno: (string | null);
    memo: (string | null);
    purchase_idno: (string | null);
    st_receive_idno?: (string | null);
    st_mbr_idno: (string | null);
    receive_items: Array<ReceiveItemCreate>;
};

