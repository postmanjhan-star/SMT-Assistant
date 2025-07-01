/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { STWorkOrderItem } from './STWorkOrderItem';

export type STWorkOrder = {
    work_order_idno: string;
    product_idno: string;
    issue_date: string;
    due_date: string;
    quantity: number;
    production_department: string;
    production_line: string;
    work_order_items?: (Array<STWorkOrderItem> | null);
};
