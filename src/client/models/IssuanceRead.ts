/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { IssuanceItemRead } from './IssuanceItemRead';

export type IssuanceRead = {
    id: number;
    created_at: string;
    updated_at: string;
    idno: string;
    date?: string;
    employee_id: number;
    memo: string;
    issuing_completed: boolean;
    issuance_items?: Array<IssuanceItemRead>;
    st_erp_work_order_idno?: string;
    st_erp_work_order_date?: string;
    st_erp_work_order_due_date?: string;
    st_erp_product_idno?: string;
    st_erp_product_due_quanity?: number;
    st_erp_production_department?: string;
    st_erp_production_line?: string;
};
