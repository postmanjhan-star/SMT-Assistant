/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { L2StorageCreate } from './L2StorageCreate';

export type StorageCreate = {
    idno: string;
    name: string;
    l2_storages: Array<L2StorageCreate>;
};