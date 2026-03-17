/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $EmployeeAccountUpdate = {
    properties: {
        full_name: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        password: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        roles: {
            type: 'any-of',
            contains: [{
                type: 'array',
                contains: {
                    type: 'string',
                },
            }, {
                type: 'null',
            }],
        },
    },
} as const;
