/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $Vendor = {
    description: `Represents a Vendor record`,
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
        name: {
    type: 'string',
    isRequired: true,
},
        tax_idno: {
    type: 'string',
},
        l1_storage_id: {
    type: 'number',
},
        l1_storage: {
    type: 'L1Storage',
},
        l2_storage_id: {
    type: 'number',
},
        l2_storage: {
    type: 'L2Storage',
},
        receives: {
    type: 'array',
    contains: {
        type: 'Receive',
    },
},
    },
} as const;