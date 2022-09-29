/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { MaterialTypeEnum } from './MaterialTypeEnum';
import type { UnitEnum } from './UnitEnum';

export type RawMaterialRead = {
    id: number;
    idno: string;
    material_type: MaterialTypeEnum;
    name?: string;
    description?: string;
    unit: UnitEnum;
    qty_per_pack: number;
    expiry_days: number;
};
