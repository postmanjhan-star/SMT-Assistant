/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type IssuanceItemRead = {
    id: number;
    issuance_id: number;
    material_inventory_id: number;
    material_inventory_idno: string;
    material_id: number;
    material_idno: string;
    material_name: string;
    material_description: string;
    l1_storage_id: (number | null);
    l1_storage_idno: (string | null);
    l2_storage_id: (number | null);
    l2_storage_idno: (string | null);
    issue_qty: string;
    lend_qty: string;
    retain_qty?: string;
    picked: boolean;
};
