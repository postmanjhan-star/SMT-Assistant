/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { L1StorageRead } from '../models/L1StorageRead';
import type { L1StorageUpdate } from '../models/L1StorageUpdate';
import type { StorageCreate } from '../models/StorageCreate';
import type { StorageRead } from '../models/StorageRead';

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class StoragesService {

    /**
     * Get Storages
     * @returns StorageRead Successful Response
     * @throws ApiError
     */
    public static getStorages(): CancelablePromise<Array<StorageRead>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/storages/',
        });
    }

    /**
     * Create Storage
     * @param requestBody
     * @returns StorageRead Successful Response
     * @throws ApiError
     */
    public static createStorage(
        requestBody: StorageCreate,
    ): CancelablePromise<StorageRead> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/storages/',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Storage
     * @param idno
     * @returns StorageRead Successful Response
     * @throws ApiError
     */
    public static getStorage(
        idno: string,
    ): CancelablePromise<StorageRead> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/storages/{idno}',
            path: {
                'idno': idno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Update L1 Storage
     * @param id
     * @param requestBody
     * @returns L1StorageRead Successful Response
     * @throws ApiError
     */
    public static updateL1Storage(
        id: number,
        requestBody: L1StorageUpdate,
    ): CancelablePromise<L1StorageRead> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/storages/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

}