/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { IssuanceItemRead } from './IssuanceItemRead';

export type IssuanceRead = {
    id: number;
    created_at: string;
    updated_at: string;
    idno: string;
    date: (string | null);
    employee_id: number;
    memo: (string | null);
    issuing_completed: boolean;
    issuance_items: (Array<IssuanceItemRead> | null);
    st_erp_work_order_idno?: (string | null);
    st_erp_work_order_date?: (string | null);
    st_erp_work_order_due_date?: (string | null);
    st_erp_product_idno?: (string | null);
    st_erp_product_due_quanity?: (number | null);
    st_erp_production_department?: (string | null);
    st_erp_production_line?: (string | null);
};

