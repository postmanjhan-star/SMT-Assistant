/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AccountPasswordUpdate } from '../models/AccountPasswordUpdate';
import type { AccountRead } from '../models/AccountRead';
import type { Body_batch_create_employee_accounts_from_csv } from '../models/Body_batch_create_employee_accounts_from_csv';
import type { EmployeeAccountCreate } from '../models/EmployeeAccountCreate';
import type { EmployeeAccountRead } from '../models/EmployeeAccountRead';
import type { EmployeeAccountUpdate } from '../models/EmployeeAccountUpdate';
import type { EmployeeAccountWithPassword } from '../models/EmployeeAccountWithPassword';

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class AccountsService {

    /**
     * Get Recent Accounts
     * @returns AccountRead Successful Response
     * @throws ApiError
     */
    public static getRecentAccounts({
        offset,
        limit = 20,
    }: {
        offset?: number,
        limit?: number,
    }): CancelablePromise<Array<AccountRead>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/accounts/',
            query: {
                'offset': offset,
                'limit': limit,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Create Employee Account
     * @returns EmployeeAccountWithPassword Successful Response
     * @throws ApiError
     */
    public static createEmployeeAccount({
        requestBody,
    }: {
        requestBody: EmployeeAccountCreate,
    }): CancelablePromise<EmployeeAccountWithPassword> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/accounts/',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Batch Create Employee Accounts
     * @returns EmployeeAccountWithPassword Successful Response
     * @throws ApiError
     */
    public static batchCreateEmployeeAccounts({
        requestBody,
    }: {
        requestBody: Array<EmployeeAccountCreate>,
    }): CancelablePromise<Array<EmployeeAccountWithPassword>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/accounts/batch',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Batch Create Employee Accounts From Csv
     * Import employees/accounts from a UTF-8 CSV.
     *
     * Required header order:
     * username,password,role,full_name,department,idno,level
     *
     * Required fields: full_name, department, idno, level.
     * If role is empty, it defaults to Operator.
     * Example row:
     * EMP001,ChangeMe123,Operator,Employee One,Production,E001,1
     * @returns EmployeeAccountWithPassword Successful Response
     * @throws ApiError
     */
    public static batchCreateEmployeeAccountsFromCsv({
        formData,
    }: {
        formData: Body_batch_create_employee_accounts_from_csv,
    }): CancelablePromise<Array<EmployeeAccountWithPassword>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/accounts/batch/csv',
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Employee Accounts Csv Template
     * Download the employee CSV template (UTF-8 with BOM).
     *
     * Header order:
     * username,password,role,full_name,department,idno,level
     *
     * Example row:
     * EMP001,ChangeMe123,Operator,Employee One,Production,E001,1
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getEmployeeAccountsCsvTemplate(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/accounts/batch/csv/template',
        });
    }

    /**
     * Reset All Employee Passwords
     * Reset all employee passwords to their employee ID (idno).
     *
     * Returns the full list of employees with their new plaintext passwords.
     * @returns EmployeeAccountWithPassword Successful Response
     * @throws ApiError
     */
    public static resetAllEmployeePasswords(): CancelablePromise<Array<EmployeeAccountWithPassword>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/accounts/reset-passwords',
        });
    }

    /**
     * Update Own Password
     * @returns EmployeeAccountRead Successful Response
     * @throws ApiError
     */
    public static updateOwnPassword({
        requestBody,
    }: {
        requestBody: AccountPasswordUpdate,
    }): CancelablePromise<EmployeeAccountRead> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/accounts/me/password',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Account Employee Information
     * @returns EmployeeAccountRead Successful Response
     * @throws ApiError
     */
    public static getAccountEmployeeInformation({
        idno,
    }: {
        idno: string,
    }): CancelablePromise<EmployeeAccountRead> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/accounts/{idno}',
            path: {
                'idno': idno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Update Account Employee
     * @returns EmployeeAccountRead Successful Response
     * @throws ApiError
     */
    public static updateAccountEmployee({
        idno,
        requestBody,
    }: {
        idno: string,
        requestBody: EmployeeAccountUpdate,
    }): CancelablePromise<EmployeeAccountRead> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/accounts/{idno}',
            path: {
                'idno': idno,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

}
