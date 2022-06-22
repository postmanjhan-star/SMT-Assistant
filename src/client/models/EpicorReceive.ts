/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { EpicorReceiveDetail } from './EpicorReceiveDetail';

export type EpicorReceive = {
    SysRevID: number;
    VendorNum: number;
    ReceiptDate: string;
    PackSlip: string;
    PONum: string;
    VendorNumName: string;
    ReceiveDetails?: Array<EpicorReceiveDetail>;
};