/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { InventoryChangeCauseEnum } from './InventoryChangeCauseEnum';

export type MaterialInventoryTransferCreate = {
    to_l2_storage_id: number;
    quantity: number;
    cause: InventoryChangeCauseEnum;
};