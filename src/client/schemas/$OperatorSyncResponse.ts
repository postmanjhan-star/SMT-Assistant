/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $OperatorSyncResponse = {
    properties: {
        synced: {
            type: 'number',
            isRequired: true,
        },
        failed: {
            type: 'array',
            contains: {
                type: 'string',
            },
        },
        new_accounts: {
            type: 'array',
            contains: {
                type: 'NewAccountInfo',
            },
        },
    },
} as const;
