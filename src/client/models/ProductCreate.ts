/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { MaterialTypeEnum } from './MaterialTypeEnum';
import type { UnitEnum } from './UnitEnum';

export type ProductCreate = {
    idno: string;
    material_type?: MaterialTypeEnum;
    name?: string;
    description?: string;
    unit: UnitEnum;
    qty_per_pack?: number;
    expiry_days?: number;
};
