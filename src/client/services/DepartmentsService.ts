/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DepartmentOption } from '../models/DepartmentOption';

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class DepartmentsService {

    /**
     * List Departments
     * @returns DepartmentOption Successful Response
     * @throws ApiError
     */
    public static listDepartments(): CancelablePromise<Array<DepartmentOption>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/departments/',
        });
    }

}
