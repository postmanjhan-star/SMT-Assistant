/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class MeService {

    /**
     * Get Authorized Modules
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getAuthorizedModules(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/me/authorized_modules',
        });
    }

}
