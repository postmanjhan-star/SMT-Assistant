/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { UnitEnum } from './UnitEnum';

export type MaterialRead = {
    expiry_days: number;
    idno: string;
    qty_per_pack: number;
    unit: UnitEnum;
    id: number;
    name?: string;
    description?: string;
};