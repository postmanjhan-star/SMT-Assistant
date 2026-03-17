/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RoleOption } from '../models/RoleOption';

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class RolesService {

    /**
     * List Roles
     * @returns RoleOption Successful Response
     * @throws ApiError
     */
    public static listRoles(): CancelablePromise<Array<RoleOption>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/roles/',
        });
    }

}
