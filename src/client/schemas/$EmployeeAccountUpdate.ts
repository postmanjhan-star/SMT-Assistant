/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $EmployeeAccountUpdate = {
    properties: {
        full_name: {
    type: 'string',
},
        password: {
    type: 'string',
},
        roles: {
    type: 'array',
    contains: {
        type: 'EmployeeRoleEnum',
    },
},
    },
} as const;