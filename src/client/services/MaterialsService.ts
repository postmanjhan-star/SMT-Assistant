/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MaterialCreate } from '../models/MaterialCreate';
import type { MaterialInventoryRead } from '../models/MaterialInventoryRead';
import type { MaterialRead } from '../models/MaterialRead';
import type { MaterialStockRecord } from '../models/MaterialStockRecord';
import type { MaterialUpdate } from '../models/MaterialUpdate';
import type { ProductCreate } from '../models/ProductCreate';
import type { ProductRead } from '../models/ProductRead';
import type { ProductUpdate } from '../models/ProductUpdate';
import type { RawMaterialCreate } from '../models/RawMaterialCreate';
import type { RawMaterialRead } from '../models/RawMaterialRead';
import type { RawMaterialUpdate } from '../models/RawMaterialUpdate';

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class MaterialsService {

    /**
     * Get Material
     * @returns MaterialRead Successful Response
     * @throws ApiError
     */
    public static getMaterial({
idno,
}: {
idno: string,
}): CancelablePromise<MaterialRead> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/materials/{idno}',
            path: {
                'idno': idno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Material In Stock Balance
     * @returns number Successful Response
     * @throws ApiError
     */
    public static getMaterialInStockBalance({
materialIdno,
onlyIssuable = false,
}: {
materialIdno: string,
onlyIssuable?: boolean,
}): CancelablePromise<number> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/materials/{material_idno}/balance/in-stock',
            path: {
                'material_idno': materialIdno,
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
     * Get Material In Production Balance
     * @returns number Successful Response
     * @throws ApiError
     */
    public static getMaterialInProductionBalance({
materialIdno,
}: {
materialIdno: string,
}): CancelablePromise<number> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/materials/{material_idno}/balance/in-production',
            path: {
                'material_idno': materialIdno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Material In Lending Balance
     * @returns number Successful Response
     * @throws ApiError
     */
    public static getMaterialInLendingBalance({
materialIdno,
}: {
materialIdno: string,
}): CancelablePromise<number> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/materials/{material_idno}/balance/in-lending',
            path: {
                'material_idno': materialIdno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Material Stock Records
     * @returns MaterialStockRecord Successful Response
     * @throws ApiError
     */
    public static getMaterialStockRecords({
idno,
}: {
idno: string,
}): CancelablePromise<Array<MaterialStockRecord>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/materials/{idno}/stock_records',
            path: {
                'idno': idno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Material Inventories
     * @returns MaterialInventoryRead Successful Response
     * @throws ApiError
     */
    public static getMaterialInventories({
materialIdno,
}: {
materialIdno: string,
}): CancelablePromise<Array<MaterialInventoryRead>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/materials/{material_idno}/inventories',
            path: {
                'material_idno': materialIdno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Material Inventories In Stock
     * @returns MaterialInventoryRead Successful Response
     * @throws ApiError
     */
    public static getMaterialInventoriesInStock({
materialIdno,
onlyIssuable = false,
}: {
materialIdno: string,
onlyIssuable?: boolean,
}): CancelablePromise<Array<MaterialInventoryRead>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/materials/{material_idno}/inventories/in-stock',
            path: {
                'material_idno': materialIdno,
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
     * Get Materials
     * @returns MaterialRead Successful Response
     * @throws ApiError
     */
    public static getMaterials(): CancelablePromise<Array<MaterialRead>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/materials/',
        });
    }

    /**
     * Create Material
     * @returns MaterialRead Successful Response
     * @throws ApiError
     */
    public static createMaterial({
requestBody,
}: {
requestBody: MaterialCreate,
}): CancelablePromise<MaterialRead> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/materials/',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Update Material
     * @returns MaterialRead Successful Response
     * @throws ApiError
     */
    public static updateMaterial({
id,
requestBody,
}: {
id: number,
requestBody: MaterialUpdate,
}): CancelablePromise<MaterialRead> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/materials/{id}',
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

    /**
     * Create Raw Material
     * @returns RawMaterialRead Successful Response
     * @throws ApiError
     */
    public static createRawMaterial({
requestBody,
}: {
requestBody: RawMaterialCreate,
}): CancelablePromise<RawMaterialRead> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/materials/raw_materials',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Update Raw Material
     * @returns RawMaterialRead Successful Response
     * @throws ApiError
     */
    public static updateRawMaterial({
id,
requestBody,
}: {
id: number,
requestBody: RawMaterialUpdate,
}): CancelablePromise<RawMaterialRead> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/materials/raw_materials/{id}',
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

    /**
     * Create Product
     * @returns ProductRead Successful Response
     * @throws ApiError
     */
    public static createProduct({
requestBody,
}: {
requestBody: ProductCreate,
}): CancelablePromise<ProductRead> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/materials/products',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Update Product
     * @returns ProductRead Successful Response
     * @throws ApiError
     */
    public static updateProduct({
id,
requestBody,
}: {
id: number,
requestBody: ProductUpdate,
}): CancelablePromise<ProductRead> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/materials/products/{id}',
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
