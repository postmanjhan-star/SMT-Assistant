/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $EmployeeAccountRead = {
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
                type: 'EmployeeRoleEnum',
            },
            isRequired: true,
        },
    },
} as const;