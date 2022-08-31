/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { IssuanceItemRead } from './IssuanceItemRead';

export type IssuanceRead = {
    id: number;
    idno: string;
    date: string;
    employee_id: number;
    memo: string;
    issuing_completed: boolean;
    issuance_items?: Array<IssuanceItemRead>;
};
