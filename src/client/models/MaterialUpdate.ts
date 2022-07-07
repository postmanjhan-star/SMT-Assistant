/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { UnitEnum } from './UnitEnum';

export type MaterialUpdate = {
    expiry_days: number;
    id: number;
    name: string;
    description?: string;
    qty_per_pack: number;
    idno: string;
    unit: UnitEnum;
};