/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { UnitEnum } from './UnitEnum';

export type RawMaterialUpdate = {
    id: number;
    idno: string;
    name?: string;
    description?: string;
    unit: UnitEnum;
    qty_per_pack: number;
    expiry_days: number;
};
