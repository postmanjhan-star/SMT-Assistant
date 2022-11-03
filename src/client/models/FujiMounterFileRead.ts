/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { FujiMounterFileItemRead } from './FujiMounterFileItemRead';

export type FujiMounterFileRead = {
    id: number;
    product_idno: string;
    product_ver: string;
    mounter_idno: string;
    board_side: string;
    fuji_mounter_file_items: Array<FujiMounterFileItemRead>;
};
