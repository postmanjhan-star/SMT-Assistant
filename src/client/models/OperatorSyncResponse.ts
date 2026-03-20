/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { NewAccountInfo } from './NewAccountInfo';

export type OperatorSyncResponse = {
    synced: number;
    failed?: Array<string>;
    new_accounts?: Array<NewAccountInfo>;
};

