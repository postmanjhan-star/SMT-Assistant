/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $IssuanceReturnRead = {
    properties: {
        id: {
            type: 'number',
            isRequired: true,
        },
        idno: {
            type: 'string',
            isRequired: true,
        },
        date: {
            type: 'string',
            isRequired: true,
            format: 'date',
        },
        employee_id: {
            type: 'number',
            isRequired: true,
        },
        employee_idno: {
            type: 'string',
            isRequired: true,
        },
        material_id: {
            type: 'number',
            isRequired: true,
        },
        material_idno: {
            type: 'string',
            isRequired: true,
        },
        material_inventory_id: {
            type: 'number',
            isRequired: true,
        },
        material_inventory_idno: {
            type: 'string',
            isRequired: true,
        },
        return_quantity: {
            type: 'string',
            isRequired: true,
        },
        issuance_return_items: {
            type: 'any-of',
            contains: [{
                type: 'array',
                contains: {
                    type: 'IssuanceReturnItemRead',
                },
            }, {
                type: 'null',
            }],
            isRequired: true,
        },
    },
} as const;
