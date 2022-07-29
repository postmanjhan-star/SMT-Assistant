/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $VendorRead = {
    properties: {
        id: {
            type: 'number',
            isRequired: true,
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
    },
} as const;