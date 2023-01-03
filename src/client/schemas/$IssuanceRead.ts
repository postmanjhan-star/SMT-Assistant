/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $IssuanceRead = {
    properties: {
        id: {
    type: 'number',
    isRequired: true,
},
        created_at: {
    type: 'string',
    isRequired: true,
    format: 'date',
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
        date: {
    type: 'string',
    format: 'date',
},
        employee_id: {
    type: 'number',
    isRequired: true,
},
        memo: {
    type: 'string',
    isRequired: true,
},
        issuing_completed: {
    type: 'boolean',
    isRequired: true,
},
        issuance_items: {
    type: 'array',
    contains: {
        type: 'IssuanceItemRead',
    },
},
    },
} as const;
