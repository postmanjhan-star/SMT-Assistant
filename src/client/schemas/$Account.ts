/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $Account = {
    description: `Represents a Account record`,
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
        username: {
    type: 'string',
    isRequired: true,
},
        password: {
    type: 'string',
    isRequired: true,
},
        type: {
    type: 'AccountTypeEnum',
    isRequired: true,
},
        employee: {
    type: 'Employee',
},
    },
} as const;