/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { EmployeeRoleEnum } from './EmployeeRoleEnum';

export type EmployeeAccountCreate = {
    role?: EmployeeRoleEnum;
    username: string;
    password: string;
};