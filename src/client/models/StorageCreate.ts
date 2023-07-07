/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { L2StorageCreate } from './L2StorageCreate';
import type { StorageTypeEnum } from './StorageTypeEnum';

export type StorageCreate = {
    idno: string;
    name: string;
    type?: StorageTypeEnum;
    l2_storages: Array<L2StorageCreate>;
};
