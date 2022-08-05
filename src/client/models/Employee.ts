/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { Account } from './Account';
import type { EmployeeRole } from './EmployeeRole';
import type { Issuance } from './Issuance';
import type { Receive } from './Receive';

/**
 * Represents a Employee record
 */
export type Employee = {
    id: number;
    created_at: string;
    updated_at: string;
    idno: string;
    full_name: string;
    account?: Account;
    account_id: number;
    employee_roles?: Array<EmployeeRole>;
    receives?: Array<Receive>;
    issuances?: Array<Issuance>;
};