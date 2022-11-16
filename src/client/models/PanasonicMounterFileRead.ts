/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { PanasonicMounterFileItemRead } from './PanasonicMounterFileItemRead';

export type PanasonicMounterFileRead = {
    id?: number;
    product_idno: string;
    product_ver: string;
    mounter_idno: string;
    board_side?: string;
    panasonic_mounter_file_items: Array<PanasonicMounterFileItemRead>;
};
