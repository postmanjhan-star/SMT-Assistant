/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { WorkflowSummaryRead } from '../models/WorkflowSummaryRead';

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class WorkflowService {

    /**
     * Get Summaries Of Workflows
     * @returns WorkflowSummaryRead Successful Response
     * @throws ApiError
     */
    public static getSummariesOfWorkflows({
        skip,
        limit,
    }: {
        skip?: (number | null),
        limit?: (number | null),
    }): CancelablePromise<Array<WorkflowSummaryRead>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/workflow/summaries',
            query: {
                'skip': skip,
                'limit': limit,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get The Workflow Instance Task Tree By Uuid
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getTheWorkflowInstanceTaskTreeByUuid({
        uuid,
    }: {
        uuid: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/workflow/workflow-instance/{uuid}/task-tree',
            path: {
                'uuid': uuid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get The Workflow Instance Tasks By Uuid
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getTheWorkflowInstanceTasksByUuid({
        uuid,
    }: {
        uuid: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/workflow/workflow-instance/{uuid}/tasks',
            path: {
                'uuid': uuid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get The Workflow Instance By Uuid
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getTheWorkflowInstanceByUuid({
        uuid,
    }: {
        uuid: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/workflow/workflow-instance/{uuid}',
            path: {
                'uuid': uuid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

}
