/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { SmtMounterFstItemRead } from './SmtMounterFstItemRead';

export type SmtMounterFstRead = {
    id: number;
    product_idno: string;
    product_ver: string;
    mounter_idno: string;
    board_side: string;
    smt_mounter_fst_items: Array<SmtMounterFstItemRead>;
};
