/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $Employee = {
    description: `Represents a Employee record`,
    properties: {
        id: {
    type: 'number',
    isRequired: true,
},
        created_at: {
    type: 'string',
    isRequired: true,
    format: 'date-time',
},
        updated_at: {
    type: 'string',
    isRequired: true,
    format: 'date-time',
},
        idno: {
    type: 'string',
    isRequired: true,
},
        full_name: {
    type: 'string',
    isRequired: true,
},
        account: {
    type: 'Account',
},
        account_id: {
    type: 'number',
    isRequired: true,
},
        employee_roles: {
    type: 'array',
    contains: {
        type: 'EmployeeRole',
    },
},
        receives: {
    type: 'array',
    contains: {
        type: 'Receive',
    },
},
        issuances: {
    type: 'array',
    contains: {
        type: 'Issuance',
    },
},
    },
} as const;