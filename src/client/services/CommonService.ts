/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BarcodeType } from '../models/BarcodeType';
import type { ImageType } from '../models/ImageType';

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class CommonService {

    /**
     * Generate Barcode
     * @param code 
     * @param codeType 
     * @param imageType 
     * @param moduleWidth 
     * @param moduleHeight 
     * @returns any Successful Response
     * @throws ApiError
     */
    public static generateBarcode(
code: string,
codeType: BarcodeType,
imageType: ImageType,
moduleWidth: number = 0.2,
moduleHeight: number = 4,
): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/common/barcode/{code_type}/{code}.{image_type}',
            path: {
                'code': code,
                'code_type': codeType,
                'image_type': imageType,
            },
            query: {
                'module_width': moduleWidth,
                'module_height': moduleHeight,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

}