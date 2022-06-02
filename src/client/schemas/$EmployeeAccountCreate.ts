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
        password: {
    type: 'string',
    isRequired: true,
},
        username: {
    type: 'string',
    isRequired: true,
},
    },
} as const;