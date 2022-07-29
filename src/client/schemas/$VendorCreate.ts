/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $VendorCreate = {
    properties: {
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
    },
} as const;