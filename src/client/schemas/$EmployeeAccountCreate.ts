/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $EmployeeAccountCreate = {
    properties: {
        role: {
    type: 'all-of',
    contains: [{
    type: 'EmployeeRoleEnum',
}],
},
        username: {
    type: 'string',
    isRequired: true,
},
        password: {
    type: 'string',
    isRequired: true,
},
    },
} as const;