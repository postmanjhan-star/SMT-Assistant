/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { Employee } from './Employee';
import type { EmployeeRoleEnum } from './EmployeeRoleEnum';

/**
 * Represents a EmployeeRole record
 */
export type EmployeeRole = {
    id: number;
    created_at: string;
    updated_at: string;
    employee_id: number;
    employee?: Employee;
    role: EmployeeRoleEnum;
};