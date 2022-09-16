/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { StorageTypeEnum } from './StorageTypeEnum';

export type MaterialInventoryBalancesRead = {
    l1_storage_id: number;
    l1_storage_type: StorageTypeEnum;
    l2_storage_id: number;
    quantity: number;
};
