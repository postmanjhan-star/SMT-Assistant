/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { InventoryChangeCauseEnum } from '../models/InventoryChangeCauseEnum';
import type { MaterialInventoryRead } from '../models/MaterialInventoryRead';
import type { MaterialInventoryTransferCreate } from '../models/MaterialInventoryTransferCreate';

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class MaterialInventoriesService {

    /**
     * Transfer Material Inventory
     * @param id 
     * @param cause 
     * @param requestBody 
     * @returns boolean Successful Response
     * @throws ApiError
     */
    public static transferMaterialInventory(
id: number,
cause: InventoryChangeCauseEnum,
requestBody: Array<MaterialInventoryTransferCreate>,
): CancelablePromise<boolean> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/material_inventories/{id}/transfer',
            path: {
                'id': id,
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
     * Get Material Inventory
     * @param materialInventoryIdno Accept `MINV20220729001` and `A3628191` types.
     * @returns MaterialInventoryRead Successful Response
     * @throws ApiError
     */
    public static getMaterialInventory(
materialInventoryIdno: string,
): CancelablePromise<MaterialInventoryRead> {
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

}