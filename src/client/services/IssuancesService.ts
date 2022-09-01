/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { IssuanceCreate } from '../models/IssuanceCreate';
import type { IssuanceItemCreate } from '../models/IssuanceItemCreate';
import type { IssuanceItemRead } from '../models/IssuanceItemRead';
import type { IssuanceRead } from '../models/IssuanceRead';
import type { IssuanceUpdate } from '../models/IssuanceUpdate';

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class IssuancesService {

    /**
     * Get Issuances
     * @returns IssuanceRead Successful Response
     * @throws ApiError
     */
    public static getIssuances(): CancelablePromise<Array<IssuanceRead>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/issuances/',
        });
    }

    /**
     * Get Issuance
     * @param issuanceIdno 
     * @returns IssuanceRead Successful Response
     * @throws ApiError
     */
    public static getIssuance(
issuanceIdno: string,
): CancelablePromise<IssuanceRead> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/issuances/{issuance_idno}',
            path: {
                'issuance_idno': issuanceIdno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Update Issuance
     * @param issuanceIdno 
     * @param requestBody 
     * @returns IssuanceRead Successful Response
     * @throws ApiError
     */
    public static updateIssuance(
issuanceIdno: string,
requestBody: IssuanceUpdate,
): CancelablePromise<IssuanceRead> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/issuances/{issuance_idno}',
            path: {
                'issuance_idno': issuanceIdno,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Create Issuance
     * Do not make transfers on issuance creating. Make transfers on `pick_issuance()`.
     * @param requestBody 
     * @returns IssuanceRead Successful Response
     * @throws ApiError
     */
    public static createIssuance(
requestBody: IssuanceCreate,
): CancelablePromise<IssuanceRead> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/issuances/create',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Create Issuance Items
     * @param issuanceIdno 
     * @param requestBody 
     * @returns IssuanceItemRead Successful Response
     * @throws ApiError
     */
    public static createIssuanceItems(
issuanceIdno: string,
requestBody: Array<IssuanceItemCreate>,
): CancelablePromise<Array<IssuanceItemRead>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/issuances/{issuance_idno}/create_items',
            path: {
                'issuance_idno': issuanceIdno,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Add Issuance Item
     * @param issuanceIdno 
     * @param requestBody 
     * @returns IssuanceItemRead Successful Response
     * @throws ApiError
     */
    public static addIssuanceItem(
issuanceIdno: string,
requestBody: IssuanceItemCreate,
): CancelablePromise<IssuanceItemRead> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/issuances/{issuance_idno}/add_item',
            path: {
                'issuance_idno': issuanceIdno,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Remove Issuance Item
     * @param issuanceItemId 
     * @param issuanceIdno 
     * @returns boolean Successful Response
     * @throws ApiError
     */
    public static removeItem(
issuanceItemId: number,
issuanceIdno: string,
): CancelablePromise<boolean> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/issuances/{issuance_idno}/{issuance_item_id}',
            path: {
                'issuance_item_id': issuanceItemId,
                'issuance_idno': issuanceIdno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Pick Material Inventory
     * Make issuance `picked` to `True`. Does not make actual transfer. To make actual transfer, call `pick_issuance()`.
     * @param materialInventoryIdno 
     * @param issuanceIdno 
     * @returns boolean Successful Response
     * @throws ApiError
     */
    public static pickMaterialInventory(
materialInventoryIdno: string,
issuanceIdno: string,
): CancelablePromise<boolean> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/issuances/{issuance_idno}/pick_material_inventory/{material_inventory_idno}',
            path: {
                'material_inventory_idno': materialInventoryIdno,
                'issuance_idno': issuanceIdno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Pick Issuance
     * @param issuanceIdno 
     * @returns IssuanceRead Successful Response
     * @throws ApiError
     */
    public static pickIssuance(
issuanceIdno: string,
): CancelablePromise<IssuanceRead> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/issuances/{issuance_idno}/pick_issuance',
            path: {
                'issuance_idno': issuanceIdno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

}
