/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { SeastoneSmartRackCellRead } from './SeastoneSmartRackCellRead';

export type L2StorageRead = {
    id: number;
    idno: string;
    name: string;
    seastone_smart_rack_cell?: SeastoneSmartRackCellRead;
};
