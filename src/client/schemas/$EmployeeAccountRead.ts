/* generated using openapi-typescript-codegen -- do no edit */
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
        type: 'EmployeeRoleEnum_Output',
    },
    isRequired: true,
},
    },
} as const;
