/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $OperatorSwitchResponse = {
    properties: {
        access_token: {
            type: 'string',
            isRequired: true,
        },
        refresh_token: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        token_type: {
            type: 'string',
            isRequired: true,
        },
        expires_in: {
            type: 'any-of',
            contains: [{
                type: 'number',
            }, {
                type: 'null',
            }],
        },
        refresh_expires_in: {
            type: 'any-of',
            contains: [{
                type: 'number',
            }, {
                type: 'null',
            }],
        },
        employee: {
            type: 'OperatorEmployeeInfo',
            isRequired: true,
        },
    },
} as const;
