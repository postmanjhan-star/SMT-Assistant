/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { OperatorEmployeeInfo } from './OperatorEmployeeInfo';

export type OperatorSwitchResponse = {
    access_token: string;
    refresh_token?: (string | null);
    token_type: string;
    expires_in?: (number | null);
    refresh_expires_in?: (number | null);
    employee: OperatorEmployeeInfo;
};

