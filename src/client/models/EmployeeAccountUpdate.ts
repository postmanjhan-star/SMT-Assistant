/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { EmployeeRoleEnum } from './EmployeeRoleEnum';

export type EmployeeAccountUpdate = {
    full_name?: string;
    password?: string;
    roles?: Array<EmployeeRoleEnum>;
};