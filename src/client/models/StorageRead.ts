/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { L2StorageRead } from './L2StorageRead';
import type { StorageTypeEnum } from './StorageTypeEnum';

export type StorageRead = {
    id: number;
    idno: string;
    name: string;
    type: StorageTypeEnum;
    l2_storages: Array<L2StorageRead>;
};
