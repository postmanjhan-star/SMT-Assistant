/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { AccountTypeEnum } from './AccountTypeEnum';
import type { Employee } from './Employee';

/**
 * Represents a Account record
 */
export type Account = {
    id: number;
    created_at: string;
    updated_at: string;
    username: string;
    password: string;
    type: AccountTypeEnum;
    employee?: Employee;
};