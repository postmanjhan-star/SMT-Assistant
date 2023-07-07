/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type MaterialInventoryRead = {
    id: number;
    idno: string;
    parent_material_inventory_id?: number;
    material_id: number;
    material_idno: string;
    material_name: string;
    l1_storage_id?: number;
    l1_storage_idno?: string;
    l2_storage_id?: number;
    l2_storage_idno?: string;
    latest_qty: number;
    receive_item_id?: number;
    issuing_locked: boolean;
    date_of_expiry: string;
    st_barcode?: string;
};
