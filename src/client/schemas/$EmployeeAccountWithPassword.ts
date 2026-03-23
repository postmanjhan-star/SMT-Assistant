/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $EmployeeAccountWithPassword = {
    properties: {
        username: {
            type: 'string',
            isRequired: true,
        },
        full_name: {
            type: 'string',
            isRequired: true,
        },
        idno: {
            type: 'string',
            isRequired: true,
        },
        roles: {
            type: 'array',
            contains: {
                type: 'string',
            },
            isRequired: true,
        },
        password: {
            type: 'string',
            isRequired: true,
        },
    },
} as const;
