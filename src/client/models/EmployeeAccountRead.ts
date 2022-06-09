/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { EmployeeRoleEnum } from './EmployeeRoleEnum';

export type EmployeeAccountRead = {
    username: string;
    full_name: string;
    idno: string;
    roles: Array<EmployeeRoleEnum>;
};