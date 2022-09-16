/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { IssuanceReturnItemRead } from './IssuanceReturnItemRead';

export type IssuanceReturnRead = {
    id: number;
    idno: string;
    date: string;
    employee_id: number;
    material_inventory_id: number;
    return_quantity: number;
    issuance_return_items?: Array<IssuanceReturnItemRead>;
};
