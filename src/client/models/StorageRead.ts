/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { L2StorageRead } from './L2StorageRead';

export type StorageRead = {
    id: number;
    idno: string;
    name: string;
    l2_storages: Array<L2StorageRead>;
};