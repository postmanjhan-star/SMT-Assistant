/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { prisma__enums__EmployeeRoleEnum } from './prisma__enums__EmployeeRoleEnum';

export type EmployeeAccountCreate = {
    role?: (prisma__enums__EmployeeRoleEnum | null);
    password: string;
    username: string;
};
