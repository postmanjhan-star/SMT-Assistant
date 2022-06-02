/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { EmployeeRoleEnum } from './EmployeeRoleEnum';

export type EmployeeAccountCreate = {
    role?: EmployeeRoleEnum;
    password: string;
    username: string;
};