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
    return_quantity: number;
    issuance_return_items?: Array<IssuanceReturnItemRead>;
};
