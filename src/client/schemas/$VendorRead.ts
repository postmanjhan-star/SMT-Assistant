/* generated using openapi-typescript-codegen -- do no edit */
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
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
            isRequired: true,
        },
        employee_id: {
            type: 'number',
            isRequired: true,
        },
        l1_storage_id: {
            type: 'any-of',
            contains: [{
                type: 'number',
            }, {
                type: 'null',
            }],
            isRequired: true,
        },
    },
} as const;
