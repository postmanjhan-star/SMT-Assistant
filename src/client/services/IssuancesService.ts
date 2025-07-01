/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { IssuanceCreate } from '../models/IssuanceCreate';
import type { IssuanceItemCreate } from '../models/IssuanceItemCreate';
import type { IssuanceItemRead } from '../models/IssuanceItemRead';
import type { IssuanceItemUpdate } from '../models/IssuanceItemUpdate';
import type { IssuanceRead } from '../models/IssuanceRead';
import type { IssuanceReturnCreate } from '../models/IssuanceReturnCreate';
import type { IssuanceReturnRead } from '../models/IssuanceReturnRead';
import type { IssuanceUpdate } from '../models/IssuanceUpdate';
import type { LedColorEnum } from '../models/LedColorEnum';
import type { MaterialInventoryRead } from '../models/MaterialInventoryRead';

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
     * @returns IssuanceRead Successful Response
     * @throws ApiError
     */
    public static getIssuance({
issuanceIdno,
}: {
issuanceIdno: string,
}): CancelablePromise<IssuanceRead> {
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
     * @returns IssuanceRead Successful Response
     * @throws ApiError
     */
    public static updateIssuance({
issuanceIdno,
requestBody,
}: {
issuanceIdno: string,
requestBody: IssuanceUpdate,
}): CancelablePromise<IssuanceRead> {
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
     * @returns IssuanceRead Successful Response
     * @throws ApiError
     */
    public static createIssuance({
requestBody,
}: {
requestBody: IssuanceCreate,
}): CancelablePromise<IssuanceRead> {
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
     * For add mulitiple issuance items
     * @returns IssuanceItemRead Successful Response
     * @throws ApiError
     */
    public static createIssuanceItems({
issuanceIdno,
requestBody,
}: {
issuanceIdno: string,
requestBody: Array<IssuanceItemCreate>,
}): CancelablePromise<Array<IssuanceItemRead>> {
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
     * For add single issuance item
     * @returns IssuanceItemRead Successful Response
     * @throws ApiError
     */
    public static addIssuanceItem({
issuanceIdno,
requestBody,
}: {
issuanceIdno: string,
requestBody: IssuanceItemCreate,
}): CancelablePromise<IssuanceItemRead> {
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
     * @returns boolean Successful Response
     * @throws ApiError
     */
    public static removeItem({
issuanceItemId,
issuanceIdno,
}: {
issuanceItemId: number,
issuanceIdno: string,
}): CancelablePromise<boolean> {
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
     * Update Issuance Item
     * @returns IssuanceItemRead Successful Response
     * @throws ApiError
     */
    public static updateIssuanceItem({
issuanceItemId,
issuanceIdno,
requestBody,
}: {
issuanceItemId: number,
issuanceIdno: string,
requestBody: IssuanceItemUpdate,
}): CancelablePromise<IssuanceItemRead> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/issuances/{issuance_idno}/{issuance_item_id}',
            path: {
                'issuance_item_id': issuanceItemId,
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
     * Pick Material Inventory
     * Make issuance `picked` to `True`. Does not make actual transfer. To make actual transfer, call `pick_issuance()`.
     * @returns boolean Successful Response
     * @throws ApiError
     */
    public static pickMaterialInventory({
materialInventoryIdno,
issuanceIdno,
}: {
materialInventoryIdno: string,
issuanceIdno: string,
}): CancelablePromise<boolean> {
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
     * @returns IssuanceRead Successful Response
     * @throws ApiError
     */
    public static pickIssuance({
issuanceIdno,
}: {
issuanceIdno: string,
}): CancelablePromise<IssuanceRead> {
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

    /**
     * Get Material Issuable Balance
     * @returns string Successful Response
     * @throws ApiError
     */
    public static getMaterialIssuableBalance({
materialIdno,
}: {
materialIdno: string,
}): CancelablePromise<string> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/issuances/issuable_balance/{material_idno}',
            path: {
                'material_idno': materialIdno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Issuable Material Inventories
     * @returns MaterialInventoryRead Successful Response
     * @throws ApiError
     */
    public static getIssuableMaterialInventories({
materialIdno,
}: {
materialIdno: string,
}): CancelablePromise<Array<MaterialInventoryRead>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/issuances/issuable_material_inventories/{material_idno}',
            path: {
                'material_idno': materialIdno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Light Up Issuance Smart Rack Cells
     * `led_color`: `0`: OFF, `1`: RED, `2`: GREEN, `3`: YELLOW, `4`: BLUE, `5`: MAGENTA, `6`: CYAN, `7`: WHITE
     * @returns boolean Successful Response
     * @throws ApiError
     */
    public static lightUpIssuanceSmartRackCells({
issuanceIdno,
ledColor,
}: {
issuanceIdno: string,
ledColor?: LedColorEnum,
}): CancelablePromise<boolean> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/issuances/{issuance_idno}/light-up',
            path: {
                'issuance_idno': issuanceIdno,
            },
            query: {
                'led_color': ledColor,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Issuacne Returns List
     * @returns IssuanceReturnRead Successful Response
     * @throws ApiError
     */
    public static getIssuacneReturnList(): CancelablePromise<Array<IssuanceReturnRead>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/issuance_returns/',
        });
    }

    /**
     * Create Issuance Return
     * @returns IssuanceReturnRead Successful Response
     * @throws ApiError
     */
    public static createIssuanceReturn({
requestBody,
}: {
requestBody: IssuanceReturnCreate,
}): CancelablePromise<IssuanceReturnRead> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/issuance_returns/',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

}
