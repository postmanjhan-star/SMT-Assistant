/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MaterialInventoryRead } from '../models/MaterialInventoryRead';

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class MaterialInventoriesService {

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