/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type MaterialInventoryRead = {
    id: number;
    idno: string;
    parent_material_inventory_id: (number | null);
    material_id: number;
    material_idno: string;
    material_name: string;
    l1_storage_id: (number | null);
    l1_storage_idno: (string | null);
    l2_storage_id: (number | null);
    l2_storage_idno: (string | null);
    latest_qty: string;
    receive_item_id: (number | null);
    issuing_locked: boolean;
    date_of_expiry: string;
    st_barcode: (string | null);
};

