/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AccountRead } from '../models/AccountRead';
import type { EmployeeAccountCreate } from '../models/EmployeeAccountCreate';
import type { EmployeeAccountRead } from '../models/EmployeeAccountRead';
import type { EmployeeAccountUpdate } from '../models/EmployeeAccountUpdate';

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class AccountsService {

    /**
     * Get Recent Accounts
     * @returns AccountRead Successful Response
     * @throws ApiError
     */
    public static getRecentAccounts(): CancelablePromise<Array<AccountRead>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/accounts/',
        });
    }

    /**
     * Create Employee Account
     * @param requestBody 
     * @returns AccountRead Successful Response
     * @throws ApiError
     */
    public static createEmployeeAccount(
requestBody: EmployeeAccountCreate,
): CancelablePromise<AccountRead> {
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
     * Get Account Employee Information
     * @param idno 
     * @returns EmployeeAccountRead Successful Response
     * @throws ApiError
     */
    public static getAccountEmployeeInformation(
idno: string,
): CancelablePromise<EmployeeAccountRead> {
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
     * @param idno 
     * @param requestBody 
     * @returns EmployeeAccountRead Successful Response
     * @throws ApiError
     */
    public static updateAccountEmployee(
idno: string,
requestBody: EmployeeAccountUpdate,
): CancelablePromise<EmployeeAccountRead> {
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