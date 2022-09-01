/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { app__routers__material_inventories__Printer } from '../models/app__routers__material_inventories__Printer';
import type { InventoryChangeCauseEnum } from '../models/InventoryChangeCauseEnum';
import type { MaterialInventoryRead } from '../models/MaterialInventoryRead';
import type { MaterialInventoryTransferCreate } from '../models/MaterialInventoryTransferCreate';

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class MaterialInventoriesService {

    /**
     * Transfer Material Inventory
     * This function is not responsible for updating material inventory's quantity.
 * It is just for making transfer records and update material inventory's storage location.
     * @returns boolean Successful Response
     * @throws ApiError
     */
    public static transferMaterialInventory({
materialInventoryId,
cause,
requestBody,
}: {
materialInventoryId: number,
cause: InventoryChangeCauseEnum,
requestBody: Array<MaterialInventoryTransferCreate>,
}): CancelablePromise<boolean> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/material_inventories/{material_inventory_id}/transfer',
            path: {
                'material_inventory_id': materialInventoryId,
            },
            query: {
                'cause': cause,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Material Inventories Label
     * @returns any Successful Response
     * @returns binary Created
     * @throws ApiError
     */
    public static getMaterialInventoriesLabel({
materialInventoryIdnos,
printer,
}: {
materialInventoryIdnos: Array<string>,
printer?: app__routers__material_inventories__Printer,
}): CancelablePromise<any | Blob> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/material_inventories/labels',
            query: {
                'material_inventory_idnos': materialInventoryIdnos,
                'printer': printer,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Material Inventory
     * @returns MaterialInventoryRead Successful Response
     * @throws ApiError
     */
    public static getMaterialInventory({
materialInventoryIdno,
}: {
/**
 * Accept `MINV20220729001` and `A3628191` types.
 */
materialInventoryIdno: string,
}): CancelablePromise<MaterialInventoryRead> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/material_inventories/{material_inventory_idno}',
            path: {
                'material_inventory_idno': materialInventoryIdno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Split Material Inventory
     * @returns MaterialInventoryRead Successful Response
     * @throws ApiError
     */
    public static splitMaterialInventory({
materialInventoryIdno,
childQuantity,
}: {
materialInventoryIdno: string,
childQuantity: number,
}): CancelablePromise<MaterialInventoryRead> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/material_inventories/{material_inventory_idno}/split',
            path: {
                'material_inventory_idno': materialInventoryIdno,
            },
            query: {
                'child_quantity': childQuantity,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

}
