/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { UnitEnum } from './UnitEnum';

export type MaterialCreate = {
    idno: string;
    unit: UnitEnum;
    description?: string;
    qty_per_pack: number;
    expiry_days?: number;
    name?: string;
};