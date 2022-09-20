/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { InventoryChangeCauseEnum } from '../models/InventoryChangeCauseEnum';
import type { MaterialInventoryBalancesRead } from '../models/MaterialInventoryBalancesRead';
import type { MaterialInventoryRead } from '../models/MaterialInventoryRead';
import type { MaterialInventoryRecordRead } from '../models/MaterialInventoryRecordRead';
import type { MaterialInventoryTransferCreate } from '../models/MaterialInventoryTransferCreate';
import type { Printer } from '../models/Printer';

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class MaterialInventoriesService {

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
printer?: Printer,
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
     * Get Material Inventory In Stock Balance
     * @returns number Successful Response
     * @throws ApiError
     */
    public static getMaterialInventoryInStockBalance({
materialInventoryId,
onlyIssuable = false,
}: {
materialInventoryId: number,
onlyIssuable?: boolean,
}): CancelablePromise<number> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/material_inventories/{material_inventory_id}/balance/in-stock',
            path: {
                'material_inventory_id': materialInventoryId,
            },
            query: {
                'only_issuable': onlyIssuable,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Material Inventory Balances
     * @returns MaterialInventoryBalancesRead Successful Response
     * @throws ApiError
     */
    public static getMaterialInventoryBalances({
materialInventoryIdno,
}: {
materialInventoryIdno: string,
}): CancelablePromise<Array<MaterialInventoryBalancesRead>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/material_inventories/{material_inventory_idno}/balances',
            path: {
                'material_inventory_idno': materialInventoryIdno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Transfer Material Inventory
     * @returns MaterialInventoryRecordRead Successful Response
     * @throws ApiError
     */
    public static transferMaterialInventory({
materialInventoryId,
cause,
fromL2StorageId,
requestBody,
checkSourceBalance = false,
}: {
materialInventoryId: number,
cause: InventoryChangeCauseEnum,
fromL2StorageId: number,
requestBody: Array<MaterialInventoryTransferCreate>,
checkSourceBalance?: boolean,
}): CancelablePromise<Array<MaterialInventoryRecordRead>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/material_inventories/{material_inventory_id}/transfer',
            path: {
                'material_inventory_id': materialInventoryId,
            },
            query: {
                'cause': cause,
                'from_l2_storage_id': fromL2StorageId,
                'check_source_balance': checkSourceBalance,
            },
            body: requestBody,
            mediaType: 'application/json',
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
