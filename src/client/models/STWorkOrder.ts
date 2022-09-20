/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { STWorkOrderItem } from './STWorkOrderItem';

export type STWorkOrder = {
    /**
     * 工單號
     */
    idno: string;
    /**
     * 工單發行日期
     */
    issue_date: string;
    work_order_items?: Array<STWorkOrderItem>;
};
