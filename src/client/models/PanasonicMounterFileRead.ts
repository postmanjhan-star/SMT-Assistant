/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { PanasonicMounterFileItemRead } from './PanasonicMounterFileItemRead';

export type PanasonicMounterFileRead = {
    id?: (number | null);
    file_name: string;
    created_at: string;
    updated_at: string;
    product_idno: string;
    product_ver: string;
    mounter_idno: string;
    board_side?: (string | null);
    panasonic_mounter_file_items?: (Array<PanasonicMounterFileItemRead> | null);
};
