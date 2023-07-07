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
    l1_storage_id?: number;
    l1_storage_idno?: string;
    l2_storage_id?: number;
    l2_storage_idno?: string;
    issue_qty: number;
    lend_qty: number;
    retain_qty?: number;
    picked: boolean;
};
