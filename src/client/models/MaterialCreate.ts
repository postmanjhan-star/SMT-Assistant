/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { UnitEnum } from './UnitEnum';

export type MaterialCreate = {
    expiry_days?: number;
    idno: string;
    qty_per_pack: number;
    unit: UnitEnum;
    name?: string;
    description?: string;
};