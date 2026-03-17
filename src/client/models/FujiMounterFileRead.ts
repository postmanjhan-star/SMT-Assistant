/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { FujiMounterFileItemRead } from './FujiMounterFileItemRead';

export type FujiMounterFileRead = {
    id: number;
    file_name: string;
    created_at: string;
    updated_at: (string | null);
    product_idno: string;
    product_ver: string;
    mounter_idno: string;
    board_side: string;
    fuji_mounter_file_items: Array<FujiMounterFileItemRead>;
};

