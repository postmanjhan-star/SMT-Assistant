/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $VendorUpdate = {
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
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
    },
} as const;
