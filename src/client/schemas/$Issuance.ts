/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $Issuance = {
    description: `Represents a Issuance record`,
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
        date: {
    type: 'string',
    isRequired: true,
    format: 'date-time',
},
        employee_id: {
    type: 'number',
    isRequired: true,
},
        employee: {
    type: 'Employee',
},
        to_l2_storage_id: {
    type: 'number',
    isRequired: true,
},
        to_l2_storage: {
    type: 'L2Storage',
},
        memo: {
    type: 'string',
},
        issuance_items: {
    type: 'array',
    contains: {
        type: 'IssuanceItem',
    },
},
    },
} as const;