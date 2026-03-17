/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { IssuanceReturnItemRead } from './IssuanceReturnItemRead';

export type IssuanceReturnRead = {
    id: number;
    idno: string;
    date: string;
    employee_id: number;
    employee_idno: string;
    material_id: number;
    material_idno: string;
    material_inventory_id: number;
    material_inventory_idno: string;
    return_quantity: string;
    issuance_return_items: (Array<IssuanceReturnItemRead> | null);
};

