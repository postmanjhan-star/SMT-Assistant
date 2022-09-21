/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { STWorkOrderItem } from './STWorkOrderItem';

export type STWorkOrder = {
    idno: string;
    issue_date: string;
    work_order_items?: Array<STWorkOrderItem>;
};
