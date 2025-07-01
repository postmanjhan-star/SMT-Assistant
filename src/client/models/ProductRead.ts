/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { MaterialTypeEnum } from './MaterialTypeEnum';
import type { UnitEnum } from './UnitEnum';

export type ProductRead = {
    id: number;
    idno: string;
    material_type: MaterialTypeEnum;
    name: (string | null);
    description: (string | null);
    unit: UnitEnum;
    qty_per_pack: string;
    expiry_days: number;
};
