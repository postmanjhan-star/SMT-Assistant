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
     * @param idno 
     * @param cause 
     * @param requestBody 
     * @returns boolean Successful Response
     * @throws ApiError
     */
    public static transferMaterialInventory(
idno: string,
cause: InventoryChangeCauseEnum,
requestBody: Array<MaterialInventoryTransferCreate>,
): CancelablePromise<boolean> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/material_inventories/{idno}/transfer',
            path: {
                'idno': idno,
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
     * @param idno Accept `MINV20220729001` and `A3628191` types.
     * @returns MaterialInventoryRead Successful Response
     * @throws ApiError
     */
    public static getMaterialInventory(
idno: string,
): CancelablePromise<MaterialInventoryRead> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/material_inventories/{idno}',
            path: {
                'idno': idno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

}