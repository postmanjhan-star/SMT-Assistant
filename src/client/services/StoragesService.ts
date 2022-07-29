/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { L1StorageUpdate } from '../models/L1StorageUpdate';
import type { L2StorageCreate } from '../models/L2StorageCreate';
import type { L2StorageRead } from '../models/L2StorageRead';
import type { L2StorageUpdate } from '../models/L2StorageUpdate';
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
     * @param l1Id
     * @param requestBody
     * @returns StorageRead Successful Response
     * @throws ApiError
     */
    public static updateL1Storage(
        l1Id: number,
        requestBody: L1StorageUpdate,
    ): CancelablePromise<StorageRead> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/storages/{l1_id}',
            path: {
                'l1_id': l1Id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Update L2 Storage
     * @param l1Id
     * @param l2Id
     * @param requestBody
     * @returns L2StorageRead Successful Response
     * @throws ApiError
     */
    public static updateL2Storage(
        l1Id: number,
        l2Id: number,
        requestBody: L2StorageUpdate,
    ): CancelablePromise<L2StorageRead> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/storages/{l1_id}/{l2_id}',
            path: {
                'l1_id': l1Id,
                'l2_id': l2Id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Create L2 Storage
     * @param l1Id
     * @param requestBody
     * @returns L2StorageRead Successful Response
     * @throws ApiError
     */
    public static createL2Storage(
        l1Id: number,
        requestBody: L2StorageCreate,
    ): CancelablePromise<L2StorageRead> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/storages/{l1_id}/l2_storages',
            path: {
                'l1_id': l1Id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

}